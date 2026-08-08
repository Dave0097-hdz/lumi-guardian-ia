import psutil
import logging
from datetime import datetime, timezone
from lumi_agent.core.base_monitor import BaseMonitor

logger = logging.getLogger(__name__)


class SystemMonitor(BaseMonitor):
# no necesita root usa el psutil en modo usuario
    CPU_UMBRAL = 10.0 
    # uso de ram/cou por proceso
    MEM_UMBRAL = 5.0 

    def __init__(self, interval_seconds: float = 5.0):
        super().__init__(name="system", interval_seconds=interval_seconds)
        # la primera llamada siempre entrega 0.0
        psutil.cpu_percent(interval=None)

    def collect(self) -> list:
        
        # bloque 1 : metricas globales del sistema, teniendo porcentaje de cpu, ram ..., + caso falle con oserror loggea y retorna  

        try:
            cpu_pct = psutil.cpu_percent(interval=None) 
            ram = psutil.virtual_memory() 
            disco = psutil.disk_usage("/") 
        except OSError as e:
            logger.error(
                    "Error al consultar psutil en '%s': %s", 
                    self.name, e, exc_info=True
                )
            return []

        try:
            conexiones = len(psutil.net_connections())
        except psutil.AccessDenied:
            conexiones = 0

        # bloque 2 : procesos relevantes, _iter y umbrales, + si un proceso falla - continue y no explota 

        procesos = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                info = proc.info
                if info["cpu_percent"] > self.CPU_UMBRAL or info["memory_percent"] > self.MEM_UMBRAL:
                    procesos.append({
                        "pid":     info["pid"],
                        "name":    info["name"],
                        "cpu_pct": info["cpu_percent"],
                        "mem_pct": info["memory_percent"],
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

            #bloque 3 : construimos el evento y lo retornnamos, + llevamos las metricas globales y los procesos relevantes
        evento = {
            "source":     "system",
            "event_type": "system_sample",
            "severity":   "info",
            "timestamp":  datetime.now(timezone.utc).isoformat(),
            "payload": {
                "cpu_pct":          cpu_pct,
                "ram_pct":          ram.percent,
                "ram_used_mb":      round(ram.used / (1024 * 1024), 1),
                "ram_total_mb":     round(ram.total / (1024 * 1024), 1),
                "disco_pct":        disco.percent,
                "disco_used_mb":    round(disco.used / (1024 * 1024), 1),
                "disco_total_mb":   round(disco.total / (1024 * 1024), 1),
                "conexiones_activas": conexiones,
                "procesos":         procesos,
            },
        }
        return [evento]