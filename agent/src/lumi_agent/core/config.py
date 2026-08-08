import logging
from pathlib import Path

# Por:
try:
    import tomllib
except ImportError:
    import tomli as tomllib

logger = logging.getLogger(__name__)


REQUIRED_KEYS = {
    "agent": {"version": str},
    "logging": {"level": str, "file": str},
    "storage": {
        "db_path" : str,
        "max_size_mb" : int ,
        "retention_days" : int,
    },
    "sensors":{
        "system_interval_seconds": int,
        "log_batch_size": int,
    },
}




def load_config (path: str, ) -> dict :
    search_path = Path(path)

    if not search_path.exists():
        raise FileNotFoundError(
            f"configuracion no encontrada : {search_path.resolve()}" 
        ) 
    
    try :
        with open (search_path, "rb") as f :
            config= tomllib.load(f)
    except FileNotFoundError as e:
        raise FileNotFoundError(f"error critico en '{search_path}' no existe ") from e 
    except tomllib.TOMLDecodeError as e :
        raise ValueError(f"toml mal formado en {search_path} {e}") from e 
    except PermissionError as e :
        raise PermissionError (f"sin permiso para la carpeta {search_path} {e}") from e
    

    
    for seccion, claves in REQUIRED_KEYS.items():
        if seccion not in config:
            raise ValueError(
                f"Falta la sección {seccion} en {search_path}"
            )
        for clave, tipo_esperado in claves.items():
            if clave not in config[seccion]:
                raise ValueError(
                    f"Falta {clave} en sección {seccion} de {search_path}"
                )
            if not isinstance(config[seccion] [clave], tipo_esperado):
                recibido = type(config[seccion] [clave]).__name__
                raise ValueError(
                    f"tipo incorrecto en  {seccion} {clave}: "
                    f"esperado {tipo_esperado.__name__}, recibido {recibido}"
                )

    return config 