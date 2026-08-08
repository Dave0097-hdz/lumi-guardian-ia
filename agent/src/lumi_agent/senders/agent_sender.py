import time
import logging
import requests
from lumi_agent.core.agent_config import AgentConfig

logger = logging.getLogger(__name__)

MAX_REINTENTOS   = 4
BACKOFF_BASE_SEG = 1


class AgenteSender:
    """
    Envía métricas, alertas y heartbeats al backend.
    La identidad viene de AgentConfig (variables de entorno).
    """

    def __init__(self, agent_config: AgentConfig):
        self.cfg = agent_config

    def _enviar_con_retry(self, url: str, payload: dict) -> bool:
        for intento in range(MAX_REINTENTOS):
            try:
                respuesta = requests.post(
                    url,
                    json=payload,
                    headers=self.cfg.headers(),
                    timeout=10
                )
                if respuesta.status_code in (200, 201):
                    return True
                logger.error(
                    "Fallo HTTP %s en %s. Respuesta: %s",
                    respuesta.status_code, url, respuesta.text
                )
            except requests.exceptions.RequestException as e:
                espera = BACKOFF_BASE_SEG * (2 ** intento)
                logger.warning(
                    "Intento %d/%d fallido: %s. Reintentando en %ds",
                    intento + 1, MAX_REINTENTOS, e, espera
                )
                time.sleep(espera)

        logger.error("Agotados los reintentos para %s", url)
        return False

    def _calcular_estado(self, payload: dict) -> str:
        cpu = payload.get("cpu_pct", 0)
        ram = payload.get("ram_pct", 0)
        if cpu > 90 or ram > 90:
            return "BAJO_ATAQUE"
        if cpu > 70 or ram > 70:
            return "ADVERTENCIA"
        return "SEGURO"

    def enviar_heartbeat(self) -> bool:
        payload = {"agenteVersion": "1.0.0"}
        exito = self._enviar_con_retry(self.cfg.url_heartbeat, payload)
        if exito:
            logger.info("Heartbeat enviado correctamente al backend")
        return exito

    def enviar_metrica(self, evento: dict) -> bool:
        payload = evento.get("payload", {})
        payload_backend = {
            "cpuPorcentaje":     payload.get("cpu_pct", 0),
            "ramUsadaMB":        payload.get("ram_used_mb", 0),
            "ramTotalMB":        payload.get("ram_total_mb", 0),
            "discoUsadaGB":      round(payload.get("disco_used_mb", 0) / 1024, 2),
            "discoTotalGB":      round(payload.get("disco_total_mb", 0) / 1024, 2),
            "discoPorcentaje":   payload.get("disco_pct", 0),
            "requestsPorMinuto": payload.get("requests_por_minuto", 0),
            "procesosActivos":   len(payload.get("procesos", [])),
            "conexionesActivas": payload.get("conexiones_activas", 0),
            "estadoGeneral":     self._calcular_estado(payload),
        }
        return self._enviar_con_retry(self.cfg.url_metricas, payload_backend)

    def enviar_alerta(self, evento: dict) -> bool:
        tipo_map = {
            "ssh_failed_login":           "IP_MALICIOSA",
            "ssh_brute_force_burst":      "BRUTE_FORCE",
            "ssh_brute_force_persistent": "BRUTE_FORCE",
            "wp_sensitive_route":         "ESCANEO_PUERTOS",
            "scanner_detected":           "ESCANEO_PUERTOS",
            "ip_flood":                   "HTTP_FLOOD",
        }
        severidad_map = {
            "critical": "CRITICA",
            "high":     "ALTA",
            "warning":  "MEDIA",
            "low":      "BAJA",
            "info":     "BAJA",
        }

        tipo    = evento.get("event_type", "unknown")
        payload = evento.get("payload", {})

        payload_backend = {
            "tipo":               tipo_map.get(tipo, "IP_MALICIOSA"),
            "severidad":          severidad_map.get(evento.get("severity", "info"), "BAJA"),
            "ipOrigen":           evento.get("source_ip", ""),
            "descripcionSimple":  self._descripcion_simple(tipo, payload),
            "descripcionTecnica": f"{tipo} detectado por el monitor {evento.get('source', '')}",
            "evidencia":          payload,
        }
        return self._enviar_con_retry(self.cfg.url_alertas, payload_backend)

    def _descripcion_simple(self, tipo: str, payload: dict) -> str:
        descripciones = {
            "ssh_brute_force_burst":
                f"Se detectaron {payload.get('intentos', '?')} intentos de acceso SSH "
                f"en menos de 5 minutos desde la IP {payload.get('attacker_ip', '?')}.",
            "ssh_brute_force_persistent":
                f"Una IP lleva {payload.get('intentos', '?')} intentos de acceso SSH "
                f"en los ultimos 15 minutos.",
            "wp_sensitive_route":
                f"Alguien exploro una seccion sensible del sitio: {payload.get('ruta', '?')}.",
            "scanner_detected":
                f"Se detecto una herramienta de escaneo automatico desde "
                f"la IP {payload.get('attacker_ip', '?')}.",
            "ip_flood":
                f"La IP {payload.get('attacker_ip', '?')} envio "
                f"{payload.get('peticiones', '?')} peticiones en poco tiempo.",
        }
        return descripciones.get(tipo, f"Evento de seguridad detectado: {tipo}")
