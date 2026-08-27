import ipaddress
import logging
import subprocess
import threading
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

UFW_BIN = "/usr/sbin/ufw"
TIMEOUT_SEG = 1.5
MAX_REGLAS_ACTIVAS = 500
RATE_LIMIT_OPS = 30
RATE_LIMIT_VENTANA_SEG = 60
PREFIJO_MINIMO_V4 = 16
PREFIJO_MINIMO_V6 = 48


class ResultadoUFW:
    BLOQUEADA    = "bloqueada"
    YA_BLOQUEADA = "ya_bloqueada"
    DESBLOQUEADA = "desbloqueada"
    NO_EXISTIA   = "no_existia"
    ERROR        = "error"


class FirewallNoDisponible(Exception):
    pass


class UFWManager:

    def __init__(self, backend_host, whitelist_extra, permitir_privadas=False):
        self.permitir_privadas = permitir_privadas
        self._whitelist = []

        for entrada in whitelist_extra:
            red = self._parsear(entrada)
            if red is None:
                logger.error("Entrada de whitelist invalida, ignorada: %r", entrada)
                continue
            self._whitelist.append(red)
            logger.info("Whitelist de control: %s", red)

        red_backend = self._parsear(backend_host)
        if red_backend is not None:
            self._whitelist.append(red_backend)
            logger.info("Backend %s incorporado a la whitelist", red_backend)
        else:
            logger.warning(
                "backend_host (%r) no es IP literal: no se puede proteger "
                "por pertenencia de red.", backend_host
            )

        self._rate_lock = threading.Lock()
        self._ufw_lock = threading.Lock()
        self._ops_recientes = []

    @staticmethod
    def _parsear(valor):
        if not valor or not isinstance(valor, str):
            return None
        texto = valor.strip()
        if "." not in texto and ":" not in texto:
            return None
        try:
            return ipaddress.ip_network(texto, strict=False)
        except ValueError:
            return None

    @staticmethod
    def _para_ufw(red):
        if red.prefixlen in (32, 128):
            return str(red.network_address)
        return str(red)

    def _motivo_proteccion(self, red):
        if red.is_loopback:
            return "loopback: bloquearla dejaria al agente incomunicado"
        if red.is_unspecified:
            return "0.0.0.0 / :: no identifica un origen concreto"
        if red.is_multicast:
            return "multicast: no es un origen de trafico unicast"
        if red.is_link_local:
            return "link-local: incluye el endpoint de metadatos del cloud"
        if red.is_reserved:
            return "rango reservado por IANA"

        minimo = PREFIJO_MINIMO_V4 if red.version == 4 else PREFIJO_MINIMO_V6
        if red.prefixlen < minimo:
            return f"prefijo /{red.prefixlen} demasiado amplio (minimo /{minimo})"

        if red.is_private and not self.permitir_privadas:
            return "rango privado: activar permitir_privadas solo en laboratorio"

        for protegida in self._whitelist:
            if red.overlaps(protegida):
                return f"la red {red} se solapa con {protegida} (whitelist)"

        return None

    def _consumir_cuota(self):
        limite = datetime.now(timezone.utc) - timedelta(seconds=RATE_LIMIT_VENTANA_SEG)
        with self._rate_lock:
            ahora = datetime.now(timezone.utc)
            self._ops_recientes = [t for t in self._ops_recientes if t >= limite]
            if len(self._ops_recientes) >= RATE_LIMIT_OPS:
                return False
            self._ops_recientes.append(ahora)
            return True

    def _ejecutar(self, argumentos):
        comando = [UFW_BIN] + argumentos
        try:
            proceso = subprocess.run(
                comando, capture_output=True, text=True,
                timeout=TIMEOUT_SEG, check=False,
            )
        except subprocess.TimeoutExpired:
            logger.error("Timeout de %.1fs ejecutando UFW", TIMEOUT_SEG)
            return False, f"timeout tras {TIMEOUT_SEG}s"
        except FileNotFoundError:
            logger.critical("UFW no encontrado en %s", UFW_BIN)
            return False, "ufw no instalado"
        except PermissionError:
            logger.critical("Sin permisos para ejecutar %s", UFW_BIN)
            return False, "sin privilegios para operar el firewall"
        except OSError as e:
            logger.error("Error del sistema ejecutando UFW: %s", e)
            return False, f"error del sistema: {e}"

        if proceso.returncode != 0:
            detalle = (proceso.stderr or "").strip()[:200]
            logger.error("UFW fallo (codigo %d): %s", proceso.returncode, detalle)
            return False, f"fallo del firewall (codigo {proceso.returncode})"

        return True, (proceso.stdout or "").strip()

    def _snapshot(self):
        ok, salida = self._ejecutar(["status", "numbered"])
        if not ok:
            raise FirewallNoDisponible(salida)

        if "Status: active" not in salida:
            logger.critical("UFW esta INACTIVO. Ejecutar 'ufw enable'.")
            raise FirewallNoDisponible("el firewall esta inactivo")

        redes = set()
        for linea in salida.splitlines():
            if "DENY" not in linea:
                continue
            for token in linea.split():
                red = self._parsear(token)
                if red is not None:
                    redes.add(red)

        return redes, len(redes)

    def bloquear(self, ip_str, motivo=""):
        red = self._parsear(ip_str)
        if red is None:
            logger.warning("Orden de bloqueo con IP invalida: %r", ip_str)
            return ResultadoUFW.ERROR, "formato de IP invalido"

        proteccion = self._motivo_proteccion(red)
        if proteccion is not None:
            logger.warning("RECHAZADO bloqueo de %s — %s", red, proteccion)
            return ResultadoUFW.ERROR, f"IP protegida: {proteccion}"

        if not self._consumir_cuota():
            logger.error("Rate limit alcanzado. Bloqueo de %s rechazado.", red)
            return ResultadoUFW.ERROR, "limite de operaciones excedido"

        with self._ufw_lock:
            try:
                bloqueadas, total = self._snapshot()
            except FirewallNoDisponible as e:
                logger.error("No se pudo consultar el firewall: %s", e)
                return ResultadoUFW.ERROR, f"firewall no disponible: {e}"

            if red in bloqueadas:
                logger.info("La regla para %s ya existia", red)
                return ResultadoUFW.YA_BLOQUEADA, "la regla ya estaba aplicada"

            if total >= MAX_REGLAS_ACTIVAS:
                logger.critical("Tope de %d reglas alcanzado", MAX_REGLAS_ACTIVAS)
                return ResultadoUFW.ERROR, f"tope de {MAX_REGLAS_ACTIVAS} reglas"

            ok, salida = self._ejecutar(
                ["insert", "1", "deny", "from", self._para_ufw(red)]
            )

        if not ok:
            logger.error("Fallo al bloquear %s: %s", red, salida)
            return ResultadoUFW.ERROR, salida

        if red.is_private:
            logger.warning(
                "Se bloqueo la red PRIVADA %s. Verificar que no corresponde "
                "a la VPN o red interna del administrador.", red
            )

        logger.warning(
            "BLOQUEADA %s — motivo: %r — reglas activas: %d",
            red, motivo, total + 1
        )
        return ResultadoUFW.BLOQUEADA, "regla UFW aplicada correctamente"

    def desbloquear(self, ip_str, motivo="", verificar=True):
        red = self._parsear(ip_str)
        if red is None:
            logger.warning("Orden de desbloqueo con IP invalida: %r", ip_str)
            return ResultadoUFW.ERROR, "formato de IP invalido"

        if not self._consumir_cuota():
            logger.error("Rate limit alcanzado. Desbloqueo de %s rechazado.", red)
            return ResultadoUFW.ERROR, "limite de operaciones excedido"

        with self._ufw_lock:
            try:
                bloqueadas, _ = self._snapshot()
            except FirewallNoDisponible as e:
                logger.error("No se pudo consultar el firewall: %s", e)
                return ResultadoUFW.ERROR, f"firewall no disponible: {e}"

            if red not in bloqueadas:
                logger.info("No habia regla activa para %s", red)
                return ResultadoUFW.NO_EXISTIA, "no habia regla que revocar"

            ok, salida = self._ejecutar(
                ["--force", "delete", "deny", "from", self._para_ufw(red)]
            )

            if not ok:
                logger.error("Fallo al desbloquear %s: %s", red, salida)
                return ResultadoUFW.ERROR, salida

            if verificar:
                try:
                    bloqueadas_despues, _ = self._snapshot()
                except FirewallNoDisponible:
                    logger.error("No se pudo verificar el desbloqueo de %s", red)
                    return ResultadoUFW.ERROR, "desbloqueo no verificable"

                if red in bloqueadas_despues:
                    logger.error(
                        "El desbloqueo de %s reporto exito pero la regla persiste", red
                    )
                    return ResultadoUFW.ERROR, "la regla persiste tras el desbloqueo"
            else:
                logger.info(
                    "Desbloqueo de %s sin verificacion inmediata "
                    "(ventana de tiempo del backend)", red
                )

        logger.warning("DESBLOQUEADA %s — motivo: %r", red, motivo)
        return ResultadoUFW.DESBLOQUEADA, "regla UFW revocada correctamente"
