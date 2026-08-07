import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

# Constantes de rotación. Las dejo aquí por ahora;
# se pueden mover a agent.toml si el equipo quiere configurarlas.
LOG_MAX_BYTES = 5 * 1024 * 1024   # 5 MB expresado en bytes
LOG_BACKUP_COUNT = 5              # cuantos archivos viejos conservamos


def setup_logger(config: dict) -> None:
    """
    Configura el logging del agente.
    Lee level y file desde la config ya cargada.
    Cada mensaje va a consola (en vivo) y a archivo (historial).
    """
    log_level = config["logging"]["level"]
    log_file = Path(config["logging"]["file"])

    #  si la carpeta no existe la creamos, + parents crea carpetas intermedias si falla ya exxiste
    
    log_file.parent.mkdir(parents=True, exist_ok=True)

    #  formato fecha nivel, modulo y mensaje
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s — %(message)s"
    )

    # handler 1: consola, para ver en vivo
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    # handler 2: archivo rotativo
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=LOG_MAX_BYTES,
        backupCount=LOG_BACKUP_COUNT,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)

    
    root = logging.getLogger()
    root.setLevel(log_level)

    # Limpiamos handlers viejos por si setup_logger se llama mas de una vez.
    # Sin esto, los mensajes saldrian duplicados.
    # limpiamoshandlers viejos, + sin esto los mensajes saldrian duplicados, + el root logger es el papa de todos le ponemos el nivel y ambos handlers
    root.handlers.clear()
    root.addHandler(console_handler)
    root.addHandler(file_handler)

    root.info("Sistema de logging inicializado")