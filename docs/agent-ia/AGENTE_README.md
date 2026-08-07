# LUMI Agent — README de referencia

## Qué hace

LUMI Agent es un agente de telemetría y seguridad que se ejecuta en un VPS o servidor cliente para supervisar eventos del sistema y de los logs. Su propósito es:

- recopilar métricas de salud del host,
- detectar actividad sospechosa en logs de SSH y HTTP,
- persistir eventos localmente en SQLite,
- y, cuando exista configuración adecuada, enviarlos a un backend central.

## Qué hace en la práctica

El agente puede:

- monitorear CPU, RAM, disco y procesos,
- revisar logs de autenticación SSH para detectar intentos de fuerza bruta,
- revisar logs de acceso HTTP/Nginx para detectar tráfico sospechoso o escaneo,
- guardar eventos en un buffer local para evitar pérdida ante problemas de red.

## Cómo lo hace

El flujo general es el siguiente:

1. Los monitores leen datos desde fuentes locales (logs, psutil, etc.).
2. Cada monitor genera eventos estructurados.
3. Los eventos pasan a una cola interna del agente.
4. Un consumidor toma esos eventos en lotes.
5. Los eventos se guardan en una base de datos local SQLite.
6. Si el backend está disponible, el agente puede intentar enviarlos.

## Dónde se ejecuta

El agente se ejecuta en el VPS cliente o servidor que se quiere monitorear. Es un componente local que no depende del backend para funcionar completamente.

En términos de despliegue:

- corre en el host objetivo,
- lee archivos locales del sistema,
- almacena datos localmente,
- y se comunica con el backend cuando está configurado.

## Arquitectura general

Componentes principales:

- Punto de entrada: main.py
  - inicia la configuración,
  - levanta los monitores,
  - inicia el consumidor,
  - gestiona apagado limpio.
- Monitores:
  - SystemMonitor: métricas del sistema.
  - SSHMonitor: análisis de logs SSH.
  - HTTPMonitor: análisis de logs de Nginx/HTTP.
- BaseMonitor:
  - define la interfaz base para todos los monitores.
- Storage:
  - maneja la persistencia local en SQLite.
- Logger:
  - centraliza logging en consola y archivo.
- AgentSender:
  - se encarga de enviar eventos al backend si está disponible.

## Requisitos

### Software

- Python 3.11 o superior
- acceso a logs del sistema
- permisos de lectura en archivos como auth.log y access.log

### Dependencias

El proyecto usa principalmente:

- psutil
- SQLite estándar de Python

## Primeros pasos de instalación

1. Crear entorno virtual

```bash
python -m venv .venv
```

2. Activar entorno

En Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

3. Instalar dependencias

```bash
pip install -e .
```

4. Crear la configuración local

El agente espera una configuración local con rutas de logs, base de datos y endpoints del backend.

## Variables de entorno y configuración

El agente debe contar con:

- token de agente o credenciales para autenticación con el backend,
- URL del backend para envío de eventos,
- rutas de logs y base de datos.

En producción conviene no hardcodear secretos y mantenerlos fuera del repositorio.

## Cómo se ejecuta

```bash
python main.py
```

Durante la ejecución, el agente:

- arranca los monitores,
- comienza a procesar eventos,
- guarda datos en la base de datos local,
- y responde a señales de apagado de forma ordenada.

## Base de datos local

El agente usa SQLite como almacenamiento local.

### Propósito

- guardar eventos cuando no hay conectividad con el backend,
- permitir inspección local,
- reducir pérdida de información ante fallos temporales.

### Características

- almacenamiento local persistente,
- escritura en lotes,
- retención configurable,
- límite de tamaño configurable.

## Tecnologías usadas

- Python 3.11+
- SQLite
- psutil
- logging rotativo
- hilos y colas internas para procesamiento concurrente

## Buenas prácticas para trabajar con el agente

- evitar modificar el flujo de monitoreo sin revisar el impacto en la cola,
- respetar el uso de timeouts al leer logs,
- mantener los monitores aislados y simples,
- probar el agente primero en modo local antes de habilitar envíos al backend.

## Cómo debe integrarse con el backend

La integración esperada es:

- el agente recolecta eventos en el VPS,
- los persiste localmente,
- y los envía al backend central mediante HTTP.

En una implementación completa, el backend debería recibir:

- métricas de salud,
- alertas de seguridad,
- heartbeats del agente,
- y, en el futuro, acciones de control como bloquear o desbloquear IPs.
