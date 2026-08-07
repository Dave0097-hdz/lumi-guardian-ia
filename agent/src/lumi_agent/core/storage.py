import sqlite3
import json
import logging
import uuid
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class Storage:
    """
    Wrapper de SQLite con WAL para el buffer local de telemetria.
    Solo el thread consumidor escribe; David puede leer desde FastAPI
    gracias a check_same_thread=False + WAL.
    """

    def __init__(self, config: dict):
        self.db_path = Path(config["storage"]["db_path"])
        # config.py ya valida que estas claves existen, no hace falta fallback.
        self.retention_days = config["storage"]["retention_days"]
        self.max_size_mb = config["storage"]["max_size_mb"]

        # Lock que garantiza una sola escritura a la vez. Necesario porque
        # check_same_thread=False quita la red de seguridad de SQLite.
        # Convierte la asuncion "solo un hilo escribe" en garantia de codigo.
        self._write_lock = threading.Lock()

        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self._optimizar_db()
            self._crear_tabla()
            logger.info("Storage inicializado en %s", self.db_path)
        except sqlite3.Error as e:
            logger.critical("Fallo critico al abrir la DB en %s: %s", self.db_path, e)
            raise

    def _optimizar_db(self) -> None:
        """PRAGMAs de rendimiento a nivel de motor."""
        self.conn.execute("PRAGMA journal_mode=WAL")
        # NORMAL: en corte de luz se pueden perder las ultimas transacciones,
        # pero la DB no se corrompe. Aceptable para telemetria.
        self.conn.execute("PRAGMA synchronous=NORMAL")
        # Cache de ~16MB (bajado desde 64MB) para respetar el presupuesto
        # de RAM del agente. El e-commerce del cliente tiene prioridad.
        self.conn.execute("PRAGMA cache_size=-16000")

    def _crear_tabla(self) -> None:
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id             TEXT PRIMARY KEY,
                timestamp      TEXT NOT NULL,
                source         TEXT NOT NULL,
                event_type     TEXT NOT NULL,
                severity       TEXT NOT NULL,
                source_ip      TEXT,
                payload        TEXT,
                baseline_ready INTEGER DEFAULT 0
            )
        """)
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp)")
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_event_type ON events(event_type)")
        # Indice compuesto para el pipeline ML de Jose.
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_ml_pipeline ON events(severity, baseline_ready)"
        )
        self.conn.commit()

    def guardar_eventos(self, eventos: List[Dict[str, Any]]) -> None:
        """Inserta eventos en lote dentro de una transaccion atomica."""
        if not eventos:
            return

        datos_procesados = []
        for ev in eventos:
            ev_id = str(ev.get("id", uuid.uuid4()))
            ts = ev.get("timestamp", datetime.now(timezone.utc).isoformat())

            # default=str evita que un objeto raro (datetime, bytes) tumbe
            # el hilo al serializar el payload.
            try:
                payload_str = json.dumps(ev.get("payload", {}), default=str)
            except TypeError as e:
                logger.error("Error serializando payload de %s: %s", ev_id, e)
                payload_str = "{}"

            # PENDIENTE (Noelia/GRC): source_ip se guarda en claro.
            # Decidir si las IPs de trafico legitimo se hashean (LFPDPPP)
            # y se conservan en claro solo las que disparan alerta.
            datos_procesados.append((
                ev_id,
                ts,
                str(ev.get("source", "unknown")),
                str(ev.get("event_type", "unknown")),
                str(ev.get("severity", "info")),
                str(ev.get("source_ip", "")),
                payload_str,
                int(ev.get("baseline_ready", 0))
            ))

        # El lock serializa las escrituras; el with self.conn maneja commit/rollback.
        try:
            with self._write_lock:
                with self.conn:
                    self.conn.executemany("""
                        INSERT INTO events
                        (id, timestamp, source, event_type, severity, source_ip, payload, baseline_ready)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, datos_procesados)
            logger.debug("Insertados %d eventos.", len(datos_procesados))
        except sqlite3.Error as e:
            logger.error("Error SQL en batch insert: %s", e)

    def limpiar_antiguos(self) -> int:
        """Borra eventos mas viejos que retention_days. Devuelve cuantos borro."""
        limite = (datetime.now(timezone.utc) - timedelta(days=self.retention_days)).isoformat()

        try:
            with self._write_lock:
                with self.conn:
                    cursor = self.conn.execute(
                        "DELETE FROM events WHERE timestamp < ?", (limite,)
                    )
                    borrados = cursor.rowcount
            logger.info("Retencion por tiempo: %d eventos eliminados.", borrados)
            return borrados
        except sqlite3.Error as e:
            logger.error("Error SQL al limpiar por tiempo: %s", e)
            return 0

    def _tamano_actual_mb(self) -> float:
        """Mide el tamano de la DB en MB, incluyendo los archivos WAL."""
        total_bytes = 0
        for sufijo in ["", "-wal", "-shm"]:
            archivo = Path(str(self.db_path) + sufijo)
            if archivo.exists():
                total_bytes += archivo.stat().st_size
        return total_bytes / (1024 * 1024)

    def limitar_por_tamano(self) -> int:
        """
        Si la DB excede max_size_mb, borra el 25% mas viejo y recupera
        espacio con VACUUM. Protege el disco del cliente ante ataques
        masivos donde la retencion por tiempo no alcanza.
        """
        tamano = self._tamano_actual_mb()
        if tamano <= self.max_size_mb:
            return 0

        logger.warning(
            "DB excede limite: %.1fMB / %dMB. Limpieza por tamano.",
            tamano, self.max_size_mb
        )

        try:
            with self._write_lock:
                with self.conn:
                    cursor = self.conn.execute("""
                        DELETE FROM events WHERE id IN (
                            SELECT id FROM events
                            ORDER BY timestamp ASC
                            LIMIT (SELECT COUNT(*) / 4 FROM events)
                        )
                    """)
                    borrados = cursor.rowcount
                # VACUUM va FUERA de la transaccion (no se permite dentro).
                # Es costoso; por eso solo cuando excedemos el limite.
                self.conn.execute("VACUUM")
            logger.warning("Limpieza por tamano: %d eventos eliminados.", borrados)
            return borrados
        except sqlite3.Error as e:
            logger.error("Error SQL al limitar por tamano: %s", e)
            return 0

    def cerrar(self) -> None:
        if self.conn:
            self.conn.close()
            logger.info("Conexion a la DB cerrada.")