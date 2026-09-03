"""
Punto de entrada del agente de telemetria LUMI Guardian AI.
Orquesta: config, logging, storage, monitores y consumidor.
Maneja apagado limpio ante señales del sistema (ISO 27001 - operacion robusta).
"""

import sys
import signal
import logging
import threading
import time
from queue import Queue, Empty

from lumi_agent.core.config import load_config
from lumi_agent.core.logger import setup_logger
from lumi_agent.core.storage import Storage
from lumi_agent.monitors.system_monitor import SystemMonitor
from lumi_agent.monitors.ssh_monitor import SSHMonitor
from lumi_agent.monitors.https_monitors import HTTPMonitor
from lumi_agent.senders.agent_sender import AgenteSender
#nuevo
from lumi_agent.core.agent_config import AgentConfig
from lumi_agent.control.ufw_manager import UFWManager
from lumi_agent.control.websocket_client import WebSocketClient

logger = logging.getLogger(__name__)

CONFIG_PATH = "config/agent.toml"
QUEUE_MAXSIZE = 1000
MANTENIMIENTO_INTERVALO_SEG = 300
#nuevo
HEARTBEAT_INTERVALO_SEG = 60


def consumidor(stop_event: threading.Event, cola: Queue,
               storage: Storage, batch_size: int,
               sender: AgenteSender = None) -> None:
    logger.info("Consumidor iniciado (batch=%d)", batch_size)
    buffer = []
    ultimo_mantenimiento = time.monotonic()
    ultimo_heartbeat = time.monotonic()

    while not stop_event.is_set() or not cola.empty():
        try:
            evento = cola.get(timeout=1.0)
            buffer.append(evento)
        except Empty:
            pass

        if len(buffer) >= batch_size:
            storage.guardar_eventos(buffer)

            # Solo enviar si NO estamos apagando. Sin esta comprobacion,
            # el consumidor se queda atrapado en reintentos del sender
            # mientras main.py cierra la base de datos por debajo.
            if sender and not stop_event.is_set():
                for evento in buffer:
                    if evento.get("source") == "system":
                        sender.enviar_metrica(evento)
                    else:
                        sender.enviar_alerta(evento)

            buffer.clear()

        ahora = time.monotonic()

        # Mantenimiento y heartbeat solo si no estamos apagando
        if not stop_event.is_set():
            if ahora - ultimo_mantenimiento >= MANTENIMIENTO_INTERVALO_SEG:
                storage.limpiar_antiguos()
                storage.limitar_por_tamano()
                ultimo_mantenimiento = ahora

            if sender and (ahora - ultimo_heartbeat) >= HEARTBEAT_INTERVALO_SEG:
                sender.enviar_heartbeat()
                ultimo_heartbeat = ahora

    if buffer:
        logger.info("Vaciando %d eventos restantes antes de cerrar.", len(buffer))
        storage.guardar_eventos(buffer)

    logger.info("Consumidor detenido.")


def registrar_senales(stop_event: threading.Event) -> None:
    def manejador(signum, frame):
        logger.info("Senal %s recibida. Iniciando apagado limpio...", signum)
        stop_event.set()

    signal.signal(signal.SIGINT, manejador)
    try:
        signal.signal(signal.SIGTERM, manejador)
    except (AttributeError, ValueError):
        logger.debug("SIGTERM no disponible en esta plataforma.")


def main() -> None:
    try:
        config = load_config(CONFIG_PATH)
    except Exception as e:
        print(f"ERROR CRITICO al cargar config: {e}", file=sys.stderr)
        sys.exit(1)

    setup_logger(config)
    logger.info("=== LUMI Guardian AI - Agente de Telemetria ===")

    try:
        storage = Storage(config)
    except Exception as e:
        logger.critical("No se pudo inicializar el storage: %s", e)
        sys.exit(1)

    stop_event = threading.Event()
    # AgenteSender opcional — si no hay credenciales, opera en modo local
    try:
        agent_cfg = AgentConfig()
        sender = AgenteSender(agent_cfg, stop_event)
        logger.info("AgenteSender activo — conectado al backend")
    except RuntimeError as e:
        logger.warning("%s — operando en modo local sin envio", e)
        sender = None

    cola = Queue(maxsize=QUEUE_MAXSIZE)

    registrar_senales(stop_event)

    # --- Canal de control por WebSocket (Fase 5) ---
    hilo_ws = None
    control_cfg = config.get("control", {})

    if sender:
        ufw = UFWManager(
            backend_host=agent_cfg.backend_url,
            whitelist_extra=control_cfg.get("whitelist_ip", []),
            permitir_privadas=control_cfg.get("permitir_privadas", True),
        )
        
        ws = WebSocketClient(agent_cfg, ufw)
        hilo_ws = threading.Thread(
            target=ws.run_forever,
            args=(stop_event,),
            name="websocket-control",
        )
        hilo_ws.start()
    else:
        logger.info("Canal de control desactivado — sin credenciales")

    monitores = [
        SystemMonitor(interval_seconds=config["sensors"]["system_interval_seconds"]),
        SSHMonitor(interval_seconds=config["sensors"]["system_interval_seconds"]),
        HTTPMonitor(interval_seconds=config["sensors"]["system_interval_seconds"]),
    ]

    batch_size = config["sensors"]["log_batch_size"]
    hilo_consumidor = threading.Thread(
        target=consumidor,
        args=(stop_event, cola, storage, batch_size, sender),
        name="consumidor",
    )
    hilo_consumidor.start()

    hilos_monitores = []
    for monitor in monitores:
        hilo = threading.Thread(
            target=monitor.run_forever,
            args=(stop_event, cola),
            name=f"monitor-{monitor.name}",
        )
        hilo.start()
        hilos_monitores.append(hilo)

    try:
        while not stop_event.is_set():
            stop_event.wait(1.0)
    except KeyboardInterrupt:
        logger.info("Interrupcion de teclado. Apagando...")
        stop_event.set()

    logger.info("Esperando a que los hilos terminen...")
    for hilo in hilos_monitores:
        hilo.join(timeout=10)
    hilo_consumidor.join(timeout=15)
    if hilo_ws is not None:
        hilo_ws.join(timeout=10)

    storage.cerrar()
    logger.info("Agente detenido de forma limpia.")


if __name__ == "__main__":
    main()