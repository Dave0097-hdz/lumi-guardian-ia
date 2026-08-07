# LUMI Agent

Agente de telemetría y seguridad en Python para **LUMI Guardián AI**. Monitorea métricas del sistema y eventos de seguridad (intentos de fuerza bruta SSH, reconocimiento HTTP en WordPress), los almacena localmente en SQLite y los transmite al backend central de forma segura.

---

## Requisitos previos

- **Sistema Operativo:** Linux — Debian/Ubuntu recomendado. El agente lee `/var/log/auth.log` y `/var/log/nginx/access.log`, rutas estándar en estas distribuciones.
- **Python 3.11 o superior.** Ver nota de compatibilidad abajo.
- **Permisos de lectura sobre logs del sistema.** El usuario que ejecute el agente debe pertenecer al grupo `adm` o correr como root. Sin esto, `SSHMonitor` y `HTTPMonitor` fallan silenciosamente con `PermissionError`.

### Nota de compatibilidad Python < 3.11

`tomllib` (usado en `config.py`) es parte de la stdlib desde Python 3.11. En versiones anteriores se requiere instalarlo manualmente:

```bash
# Solo si usas Python 3.8, 3.9 o 3.10
pip install tomli
```

Y ajustar el import en `lumi_agent/core/config.py`:

```python
# Python 3.11+
import tomllib

# Python 3.8 – 3.10
try:
    import tomllib
except ImportError:
    import tomli as tomllib
```

Adicionalmente, `psutil.process_iter()` con el argumento `attrs` (lista de atributos) cambió su comportamiento entre versiones menores. Si usas Python < 3.10, verifica que `psutil >= 5.9` esté instalado — versiones anteriores pueden requerir el parámetro `ad_value` para manejar procesos que desaparecen durante la iteración.

---

## Instalación

```bash
# 1. Clona el repositorio
git clone git@github.com:warmnoise/lumi-agent.git
cd lumi-agent

# 2. Crea el entorno virtual
python3.11 -m venv .venv
source .venv/bin/activate

# 3. Instala dependencias
pip install -e .

# Si pip no conecta a PyPI (VPN u otros), usa el mirror de Aliyun:
pip install -e . -i https://mirrors.aliyun.com/pypi/simple
```

---

## Variables de entorno

El agente requiere estas dos variables para autenticarse con el backend. **No las escribas en el código ni en `agent.toml`.**

```bash
export AGENT_TOKEN="tu_token_bearer_aqui"
export INTERNAL_SECRET_KEY="tu_llave_interna_aqui"
```

Si alguna falta, el agente arranca en **modo local** — almacena eventos en SQLite pero no los envía al backend. Útil para desarrollo y pruebas.

Para persistirlas entre sesiones, agrégalas a `~/.bashrc` o crea un archivo `.env` en la raíz (está en `.gitignore`, no se sube al repo):

```bash
# .env
AGENT_TOKEN=tu_token_bearer_aqui
INTERNAL_SECRET_KEY=tu_llave_interna_aqui
```

Y cárgalas antes de correr:

```bash
source .env && python3 main.py
```

---

## Configuración

El archivo de configuración es `config/agent.toml`. **No está en el repositorio** (`.gitignore`) porque puede contener URLs internas. Crea el tuyo a partir de esta plantilla:

```toml
[agent]
version = "0.1.0"

[logging]
level = "INFO"
file  = "logs/agent.log"

[storage]
db_path        = "data/lumi.db"
max_size_mb    = 500
retention_days = 30

[sensors]
system_interval_seconds = 5
log_batch_size          = 100

[backend]
url_metricas = "http://TU_BACKEND/api/v1/agent/metricas"
url_alerta   = "http://TU_BACKEND/api/v1/internal/alerta"
```

El agente valida todas las claves al arrancar y falla con error descriptivo si falta alguna — no arranca con config incompleta.

---

## Ejecución

```bash
# Asegúrate de tener el venv activo y las variables de entorno cargadas
source .venv/bin/activate
python3 main.py
```

Salida esperada al arrancar correctamente:

```
2026-07-27 06:46:36 [INFO] __main__ — === LUMI Guardian AI - Agente de Telemetria ===
2026-07-27 06:46:36 [INFO] storage — Storage inicializado en data/lumi.db
2026-07-27 06:46:36 [INFO] __main__ — Consumidor iniciado (batch=100)
2026-07-27 06:46:36 [INFO] base_monitor — Monitor 'system' iniciado (intervalo: 5s)
2026-07-27 06:46:36 [INFO] base_monitor — Monitor 'ssh' iniciado (intervalo: 5s)
2026-07-27 06:46:36 [INFO] base_monitor — Monitor 'http' iniciado (intervalo: 5s)
```

El `WARNING: AgenteSender no disponible` es esperado si las variables de entorno no están definidas. El agente funciona en modo local.

Apagado limpio con `Ctrl+C` — el agente vacía el buffer pendiente antes de cerrar.

Apagado esperado correctamente : 

^C2026-07-28 14:44:26,458 [INFO] __main__ — Senal 2 recibida. Iniciando apagado limpio...
2026-07-28 14:44:26,458 [INFO] __main__ — Esperando a que los hilos terminen...
2026-07-28 14:44:26,459 [INFO] lumi_agent.core.base_monitor — Monitor 'system' detenido de forma segura
2026-07-28 14:44:26,459 [INFO] lumi_agent.core.base_monitor — Monitor 'ssh' detenido de forma segura
2026-07-28 14:44:26,459 [INFO] lumi_agent.core.base_monitor — Monitor 'http' detenido de forma segura
2026-07-28 14:44:26,943 [INFO] __main__ — Vaciando 1 eventos restantes antes de cerrar.
2026-07-28 14:44:26,951 [INFO] __main__ — Consumidor detenido.
2026-07-28 14:44:26,953 [INFO] lumi_agent.core.storage — Conexion a la DB cerrada.
2026-07-28 14:44:26,953 [INFO] __main__ — Agente detenido de forma limpia.

---

## Estructura del proyecto

```
lumi-agent/
├── config/
│   └── agent.toml          # NO está en el repo — crear localmente
├── data/
│   └── lumi.db             # SQLite generado en runtime — NO subir al repo
├── logs/
│   └── agent.log           # Logs rotativos — NO subir al repo
├── lumi_agent/
│   ├── core/
│   │   ├── base_monitor.py # Contrato base para todos los monitores
│   │   ├── config.py       # Carga y valida agent.toml
│   │   ├── logger.py       # Logging a consola + archivo rotativo
│   │   └── storage.py      # Buffer SQLite con WAL
│   ├── monitors/
│   │   ├── system_monitor.py   # CPU, RAM, disco, procesos (psutil)
│   │   ├── ssh_monitor.py      # Fuerza bruta SSH desde auth.log
│   │   └── https_monitors.py   # Reconocimiento HTTP WordPress desde nginx
│   └── senders/
│       └── agent_sender.py     # Envío al backend con retry exponencial
├── tests/
├── main.py                 # Punto de entrada
└── pyproject.toml
```

---

## Verificar eventos en la base de datos

```bash
python3 -c "
import sqlite3
conn = sqlite3.connect('data/lumi.db')
cur = conn.cursor()
cur.execute('''
    SELECT event_type, severity, source_ip, timestamp
    FROM events
    ORDER BY id DESC
    LIMIT 20
''')
for fila in cur.fetchall():
    print(fila)
conn.close()
"
```

---

## Permisos requeridos por monitor

| Monitor | Archivo leído | Permiso mínimo |
|---|---|---|
| `SSHMonitor` | `/var/log/auth.log` | grupo `adm` |
| `HTTPMonitor` | `/var/log/nginx/access.log` | grupo `adm` o `www-data` |
| `SystemMonitor` | APIs de kernel vía psutil | usuario normal (sin root) |

```bash
# Agregar usuario al grupo adm (requiere logout/login para aplicar)
sudo usermod -aG adm $USER
```
