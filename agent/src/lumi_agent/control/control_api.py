import hmac
import logging
import threading
from datetime import datetime, timedelta, timezone

import uvicorn
from fastapi import FastAPI, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

from lumi_agent.control.ufw_manager import UFWManager

logger = logging.getLogger(__name__)

BIND_HOST_POR_DEFECTO = "127.0.0.1"
AUTH_MAX_FALLOS = 10
AUTH_VENTANA_SEG = 60
AUTH_LOCKOUT_SEG = 300


class OrdenControl(BaseModel):
    ip: str = Field(..., min_length=3, max_length=43)
    motivo: str = Field("", max_length=500)
    alertaId: str | None = Field(None, max_length=64)


class ControlAPI:

    def __init__(self, agent_config, ufw, puerto, bind_host=BIND_HOST_POR_DEFECTO):
        self._token_b = agent_config.token.encode("utf-8")
        self._ufw = ufw
        self._puerto = puerto
        self._bind = bind_host
        self._servidor = None

        self._auth_lock = threading.Lock()
        self._auth_fallos = []
        self._bloqueado_hasta = None

        self.app = FastAPI(
            title="LUMI Agent Control API",
            docs_url=None, redoc_url=None, openapi_url=None,
        )
        self._registrar_rutas()

    def _registrar_fallo(self):
        ahora = datetime.now(timezone.utc)
        limite = ahora - timedelta(seconds=AUTH_VENTANA_SEG)
        with self._auth_lock:
            self._auth_fallos = [t for t in self._auth_fallos if t >= limite]
            self._auth_fallos.append(ahora)
            if len(self._auth_fallos) >= AUTH_MAX_FALLOS:
                self._bloqueado_hasta = ahora + timedelta(seconds=AUTH_LOCKOUT_SEG)
                self._auth_fallos.clear()
                logger.critical(
                    "%d fallos de autenticacion en %ds. Canal bloqueado %ds. "
                    "POSIBLE COMPROMISO LOCAL.",
                    AUTH_MAX_FALLOS, AUTH_VENTANA_SEG, AUTH_LOCKOUT_SEG
                )

    def _en_lockout(self):
        with self._auth_lock:
            if self._bloqueado_hasta is None:
                return False
            if datetime.now(timezone.utc) >= self._bloqueado_hasta:
                self._bloqueado_hasta = None
                return False
            return True

    def _verificar_clave(self, clave, ruta, origen):
        if self._en_lockout():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="demasiados intentos fallidos",
            )

        if not clave:
            logger.warning("Peticion sin cabecera a %s desde %s", ruta, origen)
            self._registrar_fallo()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="cabecera de control ausente",
            )

        clave_b = clave.encode("utf-8", errors="replace")

        if not hmac.compare_digest(clave_b, self._token_b):
            logger.error("Clave invalida en %s desde %s", ruta, origen)
            self._registrar_fallo()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="cabecera de control invalida",
            )

    def _registrar_rutas(self):

        @self.app.post("/control/bloquear-ip")
        def bloquear(
            orden: OrdenControl,
            request: Request,
            x_agent_control_key: str | None = Header(default=None),
        ):
            origen = request.client.host if request.client else "desconocido"
            self._verificar_clave(x_agent_control_key, "bloquear-ip", origen)
            logger.info(
                "Orden de bloqueo — ip=%s alertaId=%s origen=%s",
                orden.ip, orden.alertaId, origen
            )
            estado, mensaje = self._ufw.bloquear(orden.ip, orden.motivo)
            return {"estado": estado, "mensaje": mensaje}

        @self.app.post("/control/desbloquear-ip")
        def desbloquear(
            orden: OrdenControl,
            request: Request,
            x_agent_control_key: str | None = Header(default=None),
        ):
            origen = request.client.host if request.client else "desconocido"
            self._verificar_clave(x_agent_control_key, "desbloquear-ip", origen)
            logger.info(
                "Orden de desbloqueo — ip=%s alertaId=%s origen=%s",
                orden.ip, orden.alertaId, origen
            )
            estado, mensaje = self._ufw.desbloquear(orden.ip, orden.motivo)
            return {"estado": estado, "mensaje": mensaje}

    def run_forever(self, stop_event):
        config = uvicorn.Config(
            self.app, host=self._bind, port=self._puerto,
            log_level="warning", access_log=False,
            limit_concurrency=20, timeout_keep_alive=5,
        )
        self._servidor = uvicorn.Server(config)

        def vigilante():
            stop_event.wait()
            if self._servidor is not None:
                self._servidor.should_exit = True

        threading.Thread(target=vigilante, name="control-api-stop", daemon=True).start()

        logger.info("API de control escuchando en %s:%d", self._bind, self._puerto)

        try:
            self._servidor.run()
        except Exception as e:
            logger.critical("La API de control termino con error: %s", e)

        logger.info("API de control detenida de forma segura")
