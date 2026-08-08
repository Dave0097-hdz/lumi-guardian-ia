import os
import time
import logging
import requests
from lumi_agent.core.storage import Storage

logger = logging.getLogger(__name__)


MAX_REINTENTOS   = 4
BACKOFF_BASE_SEG = 1   # 1s, 2s, 4s, 8s


class AgenteSender:

    def __init__(self, config: dict):
        self.url_metricas = config["backend"]["url_metricas"]
        self.url_alerta   = config["backend"]["url_alerta"]

        # viene siempre de la variable del entorno
        self.agent_token    = os.environ.get("AGENT_TOKEN")
        self.internal_key   = os.environ.get("INTERNAL_SECRET_KEY")

        if not self.agent_token or not self.internal_key:
            raise RuntimeError(
                "AGENT_TOKEN e INTERNAL_SECRET_KEY deben estar "
                "definidos como variables de entorno"
            )

    def _enviar_con_retry(self, url: str, payload: dict, headers: dict) -> bool:

        #intentamos enviar elpayload, si este falla se reintenta con el  backoof, retorna tru si tiene exito, y falso si se acaban los intentos
        
        for intento in range(MAX_REINTENTOS):
            try:
                respuesta = requests.post(url, json=payload, headers=headers, timeout=10)

                if respuesta.status_code == 200 or respuesta.status_code == 201 :
                    return True
                else :
                    logging.error("Fallo HTTP %s. Respuesta: %s", respuesta.status_code, respuesta.text)

            except requests.exceptions.RequestException as e:
                espera = BACKOFF_BASE_SEG * (2 ** intento)
                logger.warning(
                    "Intento %d/%d fallido: %s. Reintentando en %ds",
                    intento + 1, MAX_REINTENTOS, e, espera
                )
                time.sleep(espera)

        logger.error("Agotados los reintentos para %s", url)
        return False

    def enviar_metrica(self, evento: dict) -> bool:
        payload = evento.get("payload", {})
        payload_david = {
            "cpuPorcentaje":    payload.get("cpu_pct", 0),
            "ramUsadaMB":       payload.get("ram_used_mb", 0),
            "discoPorcentaje":  payload.get("disco_pct", 0),
            "agenteVersion":    "1.0.0",
        }
        headers = {
            "Authorization": f"Bearer {self.agent_token}",
            "Content-Type":  "application/json"
        }
        return self._enviar_con_retry(self.url_metricas, payload_david, headers)


    def enviar_alerta(self, evento: dict) -> bool:

        # primero : se arma la cabecera ussando x internal como llave 
        """Envía una alerta de seguridad al endpoint de David."""
        
        headers_alerta = {
            "X-Internal-Key": self.internal_key,
            "Content-Type": "application/json"
        }
        
        # Diccionario para traducir de tus eventos a MITRE
        # diccionario para traducir los eventos a Mitre
        mitre_map = {
            "ssh_failed_login": "T1110",             
            "ssh_brute_force_burst": "T1110.001",    
            "ssh_brute_force_persistent": "T1110.003" 
        }
        
        # obtengo el nombre del evento de forma segura 
        tipo = evento.get("event_type", "unknown")
        tecnica = mitre_map.get(tipo, "T1000") 
        
        # copiamos el evento original y lo fusionamos con Mitre
        payload_modificado = evento.copy() 
        payload_modificado["tecnicaMitre"] = tecnica
        
        # si todo sale bien lo envio con exito
        return self._enviar_con_retry(self.url_alerta, payload_modificado, headers_alerta)