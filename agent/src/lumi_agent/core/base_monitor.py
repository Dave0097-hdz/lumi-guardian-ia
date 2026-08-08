import logging
import threading
import time
from abc import ABC, abstractmethod
from queue import Queue, Full
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class BaseMonitor(ABC):
    """
    Contrato base para los sensores del agente.
    Cada sensor concreto hereda de aqui e implementa collect().
    """

    # si un ciclo llega a tardar mucho lo reistramos como advertencia de rendimiento
    SLOW_COLLECT_THRESHOLD = 1.0

    def __init__(self, name: str, interval_seconds: float = 5.0):
        # prefiero falle al crear el monitor que en plena operacion  + si esta opoerando ya es tarde
        if not name or not name.strip():
            raise ValueError("El nombre del monitor no puede estar vacio")
        if interval_seconds <= 0:
            raise ValueError(
                f"interval_seconds debe ser positivo, se recibio {interval_seconds}"
            )

        self.name = name
        self.interval_seconds = interval_seconds
        self._consecutive_errors = 0

    @abstractmethod
    def collect(self) -> List[Dict[str, Any]]:
        """
        Recolecta datos y devuelve una lista de diccionarios (eventos).
        IMPORTANTE: toda operacion de IO aqui dentro debe tener su propio timeout.
        """
        ...

    def _validar_eventos(self, eventos: Any) -> List[Dict[str, Any]]:
        """
        Defiende contra implementaciones de collect() que devuelvan basura.
        Garantiza que lo que sale es una lista de dicts limpia.
        """
        if eventos is None:
            return []

        # collect al deolver la lista retorna algo como : dict, str , + seria un error de implementacion de sensor , + no tumbamos al agente 
        if not isinstance(eventos, list):
            logger.error(
                "Monitor '%s': collect() devolvio %s en vez de lista. Ciclo ignorado.",
                self.name, type(eventos).__name__
            )
            return []

        # hay que filtrar los evento que no sean dicts, + evento mal formado rompe al consumidor
        limpios = []
        for ev in eventos:
            if isinstance(ev, dict):
                limpios.append(ev)
            else:
                logger.warning(
                    "Monitor '%s': evento descartado por no ser dict (%s).",
                    self.name, type(ev).__name__
                )
        return limpios

    def run_forever(self, stop_event: threading.Event, output_queue: Queue) -> None:
        logger.info(
            "Monitor '%s' iniciado (intervalo: %ss)",
            self.name, self.interval_seconds
        )

        while not stop_event.is_set():
            inicio = time.monotonic()

            try:
                eventos = self._validar_eventos(self.collect())

                if self._consecutive_errors > 0:
                    logger.info(
                        "Monitor '%s' recuperado tras %d fallos.",
                        self.name, self._consecutive_errors
                    )
                    self._consecutive_errors = 0

                for evento in eventos:
                    try:
                        output_queue.put(evento, timeout=2.0)
                    except Full:
                        logger.warning(
                            "Cola llena. Descartando metrica de '%s' (backpressure).",
                            self.name
                        )
                        break  

            except Exception as e:
                self._consecutive_errors += 1
                if self._consecutive_errors <= 3 or self._consecutive_errors % 10 == 0:
                    logger.error(
                        "Error en monitor '%s' (fallo #%d): %s",
                        self.name, self._consecutive_errors, e,
                        exc_info=(self._consecutive_errors <= 3)
                    )

            # medimos cuanto tardo un ciclo 
            duracion = time.monotonic() - inicio

            if duracion > self.SLOW_COLLECT_THRESHOLD:
                logger.warning(
                    "Monitor '%s' tardo %.2fs en un ciclo (umbral %.1fs).",
                    self.name, duracion, self.SLOW_COLLECT_THRESHOLD
                )

            espera = max(0.0, self.interval_seconds - duracion)
            stop_event.wait(espera)

        logger.info("Monitor '%s' detenido de forma segura", self.name)