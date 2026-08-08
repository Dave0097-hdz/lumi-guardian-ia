import os
import logging
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

VARIABLES_REQUERIDAS = [
    "LUMI_VPS_ID",
    "LUMI_AGENT_TOKEN",
    "LUMI_BACKEND_URL",
]


class AgentConfig:

    def __init__(self):
        faltantes = [v for v in VARIABLES_REQUERIDAS if not os.environ.get(v)]
        if faltantes:
            raise RuntimeError(
                f"Faltan variables de entorno obligatorias: {', '.join(faltantes)}. "
                "El agente no puede identificarse contra el backend."
            )

        self.vps_id      = os.environ["LUMI_VPS_ID"]
        self.token       = os.environ["LUMI_AGENT_TOKEN"]
        self.backend_url = os.environ["LUMI_BACKEND_URL"].rstrip("/") + "/"

        logger.info(
            "Agente identificado — VPS: %s, Backend: %s",
            self.vps_id, self.backend_url
        )

    @property
    def url_metricas(self) -> str:
        return urljoin(self.backend_url, "api/v1/agent/metricas")

    @property
    def url_alertas(self) -> str:
        return urljoin(self.backend_url, "api/v1/agent/alertas")

    @property
    def url_heartbeat(self) -> str:
        return urljoin(self.backend_url, "api/v1/agent/heartbeat")

    def headers(self) -> dict:
        return {
            "Authorization": f"Agent {self.token}",  # Agent, no Bearer
            "X-Vps-Id":      self.vps_id,            # sin el prefijo Lumi
            "Content-Type":  "application/json",
        }
