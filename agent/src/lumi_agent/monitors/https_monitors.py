import os
import re
import logging
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict
from lumi_agent.core.base_monitor import BaseMonitor

logger = logging.getLogger(__name__)

# formato del log de nginx:
PATRON_NGINX = re.compile(
    r'(?P<ip>\S+) - - \[(?P<fecha>[^\]]+)\] '
    r'"(?P<metodo>\S+) (?P<ruta>\S+) \S+" '
    r'(?P<status>\d{3}) \S+ "\S+" "(?P<user_agent>[^"]*)"'
)

# rutas que van a intentar reconocer y/o asaltar en wordpress
RUTAS_SENSIBLES = [
    "/wp-json/wp/v2/users",
    "/wp-admin",
    "/wp-content",
    "/wp-includes",
    "/wp-login.php",
    "/xmlrpc.php",
]

# user agent scanners conocidos
SCANNERS_CONOCIDOS = [
    "nikto", "sqlmap", "gobuster", "dirbuster",
    "masscan", "nmap", "wfuzz", "hydra"
]

# maximo(umbral) de rafagas: numero n de peticiones por una ip en un ciclo
UMBRAL_RAFAGA = 20


class HTTPMonitor(BaseMonitor):

    LOG_PATH = Path("/var/log/nginx/access.log")

    def __init__(self, interval_seconds: float = 10.0):
        super().__init__(name="http", interval_seconds=interval_seconds)
        self._posicion = 0
        self._inode    = None
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
            return estado.st_ino != self._inode
            if estado.st_size < self._posicion:
                logger.info("Truncado detectado en %s", self.LOG_PATH)
                return True
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

    def collect(self) -> list:
        if not self.LOG_PATH.exists():
            logger.warning("nginx access.log no encontrado en %s", self.LOG_PATH)
            return []

        try:
            if self._detecto_rotacion():
                logger.info("Rotacion detectada en access.log")
                self._resetear_tras_rotacion()

            eventos = []
            # contador de ip por ciclo
            conteo_ip = defaultdict(int)

            with open(self.LOG_PATH, "r", encoding="utf-8", errors="replace") as f:
                f.seek(self._posicion)

                for linea in f:
                    match = PATRON_NGINX.search(linea)
                    if not match:
                        continue

                    ip         = match.group("ip")
                    ruta       = match.group("ruta")
                    status     = match.group("status")
                    user_agent = match.group("user_agent").lower()

                    # contamos las ips para la deteccion despues
                    conteo_ip[ip] += 1

                    # punto 1: rutas sensibles en wordpress
                    ruta_limpia = ruta.split('?', 1)[0]
                    if any(ruta_limpia.startswith(p) for p in RUTAS_SENSIBLES):
                        eventos.append({
                            "source":     "http",
                            "event_type": "wp_sensitive_route",
                            "severity":   "warning",
                            "timestamp":  datetime.now(timezone.utc).isoformat(),
                            "source_ip":  ip,
                            "payload": {
                                "ruta":       ruta,
                                "status":     status,
                                "attacker_ip": ip,
                                "user_agent": user_agent,
                            }
                        })

                    # punto 2: scanner conocido
                    for scaner in SCANNERS_CONOCIDOS:
                        if scaner in user_agent:
                            eventos.append({
                                "source":     "http",
                                "event_type": "scanner_detected",
                                "severity":   "high",
                                "timestamp":  datetime.now(timezone.utc).isoformat(),
                                "source_ip":  ip,
                                "payload": {
                                    "user_agent":  user_agent,
                                    "attacker_ip": ip,
                                    "ruta":        ruta,
                                }
                            })
                            break

                # guardamos la posicion final despues del loop
                self._posicion = f.tell()

            # punto 3: rafaga por ip
            for ip, conteo in conteo_ip.items():
                if conteo >= UMBRAL_RAFAGA:
                    eventos.append({
                        "source":     "http",
                        "event_type": "ip_flood",
                        "severity":   "high",
                        "timestamp":  datetime.now(timezone.utc).isoformat(),
                        "source_ip":  ip,
                        "payload": {
                            "attacker_ip": ip,
                            "peticiones":  conteo,
                        }
                    })

            return eventos

        except PermissionError:
            logger.error(
                "Sin permisos para leer %s — usuario necesita grupo 'adm'",
                self.LOG_PATH
            )
            return []
        except OSError as e:
            logger.error("Error leyendo access.log: %s", e)
            return []