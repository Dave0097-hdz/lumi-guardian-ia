import os
import re
import logging
from collections import defaultdict, deque
from datetime import datetime, timezone, timedelta
from pathlib import Path
from lumi_agent.core.base_monitor import BaseMonitor

logger = logging.getLogger(__name__)

PATRON_FALLO = re.compile(
    r".*Failed password for (?:invalid user )?(\S+) from (\S+) port"
)

PATRON_USER_INVALID = re.compile(
    r".*Invalid user (\S+) from (\S+) port"
)


class SSHMonitor(BaseMonitor):

    LOG_PATH = Path("/var/log/auth.log")

    VENTANA_CORTA_MIN  = 5
    VENTANA_LARGA_MIN  = 15
    UMBRAL_CORTO       = 3
    UMBRAL_LARGO       = 7

    def __init__(self, interval_seconds: float = 5.0):
        super().__init__(name="ssh", interval_seconds=interval_seconds)
        self._posicion = 0
        self._inode    = None
        self._ultima_alerta_ip: dict[str, datetime] = {}
        self._intentos_por_ip: dict[str, deque] = defaultdict(lambda: deque(maxlen=50))
        self._inicializar_posicion()

    def _inicializar_posicion(self) -> None:
        try:
            estado = os.stat(self.LOG_PATH)
            self._inode = estado.st_ino
            with open(self.LOG_PATH, "r", encoding="utf-8", errors="replace") as f:
                f.seek(0, 2)
                self._posicion = f.tell()
        except FileNotFoundError:
            self._posicion = 0
            self._inode = None

    def _detecto_rotacion(self) -> bool:
        try:
            estado = os.stat(self.LOG_PATH)
            if estado.st_ino != self._inode:
                return True
            if estado.st_size < self._posicion:
                return True
            return False
        except FileNotFoundError:
            return True

    def _resetear_tras_rotacion(self) -> None:
        try:
            self._posicion = 0
            estado = os.stat(self.LOG_PATH)
            self._inode = estado.st_ino
        except FileNotFoundError:
            self._posicion = 0
            self._inode = None

    def _evaluar_ip(self, ip: str, timestamp_evento: datetime) -> list:
        alertas = []
        self._intentos_por_ip[ip].append(timestamp_evento)
        ahora = datetime.now(timezone.utc)
        limite_corto = ahora - timedelta(minutes=self.VENTANA_CORTA_MIN)
        limite_largo = ahora - timedelta(minutes=self.VENTANA_LARGA_MIN)
        conteo_corto = 0
        conteo_largo = 0
        for tiempo_guardado in self._intentos_por_ip[ip]:
            if tiempo_guardado >= limite_corto:
                conteo_corto += 1
            if tiempo_guardado >= limite_largo:
                conteo_largo += 1
        hora_ultima_alerta = self._ultima_alerta_ip.get(ip)
        if hora_ultima_alerta and (ahora - hora_ultima_alerta) < timedelta(minutes=1):
            return alertas
        if conteo_corto >= self.UMBRAL_CORTO:
            logger.critical(
                "Alerta: Ataque explosivo desde la IP %s con %s intentos en menos de 5 minutos",
                ip, conteo_corto
            )
            evento_explosivo = {
                "source":     "ssh",
                "event_type": "ssh_brute_force_burst",
                "severity":   "critical",
                "timestamp":  ahora.isoformat(),
                "source_ip":  ip,
                "payload": {
                    "attacker_ip": ip,
                    "intentos":    conteo_corto,
                }
            }
            self._ultima_alerta_ip[ip] = ahora
            alertas.append(evento_explosivo)
            return alertas
        if conteo_largo >= self.UMBRAL_LARGO:
            logger.warning(
                "Intento de intrusion persistente desde la IP %s con %s intentos en 15 minutos",
                ip, conteo_largo
            )
            evento_persistente = {
                "source":     "ssh",
                "event_type": "ssh_brute_force_persistent",
                "severity":   "high",
                "timestamp":  ahora.isoformat(),
                "source_ip":  ip,
                "payload": {
                    "attacker_ip": ip,
                    "intentos":    conteo_largo,
                }
            }
            self._ultima_alerta_ip[ip] = ahora
            alertas.append(evento_persistente)
        return alertas

    def collect(self) -> list:
        if not self.LOG_PATH.exists():
            logger.warning("auth.log no encontrado en %s", self.LOG_PATH)
            return []
        try:
            if self._detecto_rotacion():
                logger.info("Rotacion detectada en auth.log — releyendo desde inicio")
                self._resetear_tras_rotacion()
            eventos = []
            with open(self.LOG_PATH, "r", encoding="utf-8", errors="replace") as f:
                f.seek(self._posicion)
                for linea in f:
                    match = PATRON_FALLO.search(linea)
                    if match:
                        user      = match.group(1)
                        ip        = match.group(2)
                        severidad = "warning"
                    else:
                        match = PATRON_USER_INVALID.search(linea)
                        if match:
                            user      = match.group(1)
                            ip        = match.group(2)
                            severidad = "low"
                    if match:
                        hora_actual = datetime.now(timezone.utc)
                        event_base = {
                            "source":     "ssh",
                            "event_type": "ssh_failed_login",
                            "source_ip":  ip,
                            "severity":   severidad,
                            "timestamp":  hora_actual.isoformat(),
                            "payload": {
                                "target_user": user,
                                "attacker_ip": ip,
                            }
                        }
                        eventos.append(event_base)
                        nuevas_alertas = self._evaluar_ip(ip, hora_actual)
                        if nuevas_alertas:
                            eventos.extend(nuevas_alertas)
                self._posicion = f.tell()
            return eventos
        except PermissionError:
            logger.error("Sin permisos para leer %s", self.LOG_PATH)
            return []
        except OSError as e:
            logger.error("Error leyendo auth.log: %s", e)
            return []
