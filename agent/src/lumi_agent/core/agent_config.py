import os
import logging
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)


class AgentConfig:

    def __init__(self):
        self.vps_id      = os.environ.get("LUMI_VPS_ID", "")
        self.token       = os.environ.get("LUMI_AGENT_TOKEN", "")
        self.backend_url = os.environ.get("LUMI_BACKEND_URL", "").rstrip("/") + "/"
        # Host aislado: la whitelist de control lo necesita como dato
        # suelto para comparar pertenencia de red.
        self.backend_host = urlparse(self.backend_url).hostname or ""

        if not self.vps_id or not self.token or not self.backend_url.strip("/"):
            raise RuntimeError(
                "Sin credenciales de agente configuradas — operando en modo local"
            )

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