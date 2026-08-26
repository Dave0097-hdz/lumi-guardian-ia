import logging
import threading
import time

import socketio

from lumi_agent.control.ufw_manager import UFWManager

logger = logging.getLogger(__name__)

NAMESPACE = "/agents"
ESTADOS_EXITO_BLOQUEO    = {"bloqueada", "ya_bloqueada"}
ESTADOS_EXITO_DESBLOQUEO = {"desbloqueada", "no_existia"}
PRESUPUESTO_RESPUESTA_SEG = 4.0


class WebSocketClient:

    def __init__(self, agent_config, ufw: UFWManager):
        self.cfg = agent_config
        self.ufw = ufw

        self._procesados: set[str] = set()
        self._procesados_lock = threading.Lock()

        self.sio = socketio.Client(
            reconnection=True,
            reconnection_attempts=0,
            reconnection_delay=1,
            reconnection_delay_max=30,
            logger=False,
            engineio_logger=False,
        )

        self._registrar_handlers()

    def _ya_procesado(self, bloqueo_id: str) -> bool:
        if not bloqueo_id:
            return False

        with self._procesados_lock:
            if bloqueo_id in self._procesados:
                logger.warning("Orden %s ya procesada anteriormente", bloqueo_id)
                return True
            self._procesados.add(bloqueo_id)
            if len(self._procesados) > 1000:
                self._procesados.clear()
            return False

    def _responder(self, evento, bloqueo_id, exito, mensaje):
        try:
            self.sio.emit(evento, {
                "bloqueoId": bloqueo_id,
                "exito": exito,
                "mensaje": mensaje,
            }, namespace=NAMESPACE)
            logger.info(
                "Resultado emitido — evento=%s bloqueoId=%s exito=%s",
                evento, bloqueo_id, exito
            )
        except Exception as e:
            logger.error("No se pudo emitir %s: %s", evento, e)

    def _registrar_handlers(self):

        @self.sio.event(namespace=NAMESPACE)
        def connect():
            logger.info("WebSocket conectado al backend (namespace %s)", NAMESPACE)

        @self.sio.event(namespace=NAMESPACE)
        def connect_error(data):
            logger.error(
                "El backend rechazo la conexion WebSocket: %s. "
                "Revisar LUMI_AGENT_TOKEN y LUMI_VPS_ID.", data
            )

        @self.sio.event(namespace=NAMESPACE)
        def disconnect():
            logger.warning(
                "WebSocket desconectado. El cliente reintentara solo. "
                "Mientras tanto no se pueden recibir ordenes de bloqueo."
            )

        @self.sio.on("bloquear-ip", namespace=NAMESPACE)
        def on_bloquear(data):
            self.sio.start_background_task(self._procesar_bloqueo, data)

        @self.sio.on("desbloquear-ip", namespace=NAMESPACE)
        def on_desbloquear(data):
            self.sio.start_background_task(self._procesar_desbloqueo, data)

    def _procesar_bloqueo(self, data):
        if not isinstance(data, dict):
            logger.error("Payload de bloqueo no es dict: %s", type(data).__name__)
            return

        bloqueo_id = str(data.get("bloqueoId", ""))
        ip         = str(data.get("ip", ""))
        motivo     = str(data.get("motivo", ""))

        if not ip or not bloqueo_id:
            self._responder("bloqueo-resultado", bloqueo_id, False, "payload incompleto")
            return

        if self._ya_procesado(bloqueo_id):
            self._responder("bloqueo-resultado", bloqueo_id, True, "orden ya procesada")
            return

        logger.info("Orden de bloqueo — ip=%s bloqueoId=%s", ip, bloqueo_id)
        inicio = time.monotonic()

        try:
            estado, mensaje = self.ufw.bloquear(ip, motivo)
            exito = estado in ESTADOS_EXITO_BLOQUEO
        except Exception as e:
            logger.error("Error ejecutando bloqueo de %s: %s", ip, e, exc_info=True)
            estado, mensaje, exito = "error", f"error interno: {e}", False

        duracion = time.monotonic() - inicio
        if duracion > PRESUPUESTO_RESPUESTA_SEG:
            logger.warning(
                "El bloqueo de %s tardo %.2fs — el backend corta a los "
                "5s y pudo haberlo marcado FALLIDO pese al exito local.",
                ip, duracion
            )

        self._responder("bloqueo-resultado", bloqueo_id, exito, mensaje)

    def _procesar_desbloqueo(self, data):
        if not isinstance(data, dict):
            logger.error("Payload de desbloqueo no es dict: %s", type(data).__name__)
            return

        bloqueo_id = str(data.get("bloqueoId", ""))
        ip         = str(data.get("ip", ""))

        if not ip or not bloqueo_id:
            self._responder("desbloqueo-resultado", bloqueo_id, False, "payload incompleto")
            return

        if self._ya_procesado(bloqueo_id):
            self._responder("desbloqueo-resultado", bloqueo_id, True, "orden ya procesada")
            return

        logger.info("Orden de desbloqueo — ip=%s bloqueoId=%s", ip, bloqueo_id)
        inicio = time.monotonic()

        try:
            estado, mensaje = self.ufw.desbloquear(ip, verificar=False)
            exito = estado in ESTADOS_EXITO_DESBLOQUEO
        except Exception as e:
            logger.error("Error ejecutando desbloqueo de %s: %s", ip, e, exc_info=True)
            estado, mensaje, exito = "error", f"error interno: {e}", False

        duracion = time.monotonic() - inicio
        if duracion > PRESUPUESTO_RESPUESTA_SEG:
            logger.warning(
                "El desbloqueo de %s tardo %.2fs — el backend corta a los 5s.",
                ip, duracion
            )

        self._responder("desbloqueo-resultado", bloqueo_id, exito, mensaje)

    def run_forever(self, stop_event):
        url = self.cfg.backend_url.rstrip("/")

        if not url.startswith("https://"):
            logger.warning(
                "WebSocket sin TLS hacia %s. El agentToken viaja en "
                "claro. Aceptable solo en laboratorio.", url
            )

        headers = {
            "Authorization": f"Bearer {self.cfg.token}",
            "X-Lumi-Vps-Id": self.cfg.vps_id,
        }

        logger.info("Conectando WebSocket a %s%s", url, NAMESPACE)

        try:
            self.sio.connect(
                url,
                namespaces=[NAMESPACE],
                headers=headers,
                wait_timeout=10,
            )
        except Exception as e:
            logger.error("No se pudo conectar al WebSocket: %s", e)
            return

        stop_event.wait()

        if self.sio.connected:
            self.sio.disconnect()
        logger.info("WebSocket desconectado de forma limpia")
