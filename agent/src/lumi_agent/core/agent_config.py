import os
import sys
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
        presentes = [v for v in VARIABLES_REQUERIDAS if os.environ.get(v)]

        if len(presentes) == 0:
            raise RuntimeError(
                "Sin credenciales de agente configuradas — operando en modo local"
            )

        if len(presentes) < len(VARIABLES_REQUERIDAS):
            faltantes = [v for v in VARIABLES_REQUERIDAS if v not in presentes]
            logger.critical(
                "Configuración de agente incompleta — faltan: %s. "
                "Esto es un error de configuración, no modo local intencional.",
                ", ".join(faltantes)
            )
            sys.exit(1)

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
            "Authorization": f"Bearer {self.token}",
            "X-Lumi-Vps-Id": self.vps_id,
            "Content-Type":  "application/json",
        }