# LUMI — Guía de integración entre agente, backend y frontend

## Objetivo

Este documento describe cómo debe integrarse el ecosistema completo de LUMI: el agente Python, el backend NestJS y el frontend Angular.

## Arquitectura general del sistema

### 1. Agente Python
El agente corre en el VPS o servidor monitoreado. Su responsabilidad es:

- recolectar métricas del sistema,
- detectar eventos sospechosos en logs,
- guardar información localmente,
- y enviar datos al backend central.

### 2. Backend NestJS
El backend actúa como la capa central de procesamiento y almacenamiento. Su responsabilidad es:

- recibir métricas y heartbeats del agente,
- autenticar y administrar VPS,
- persistir datos en PostgreSQL,
- exponer información a la interfaz web.

### 3. Frontend Angular
El frontend es la capa de presentación. Su responsabilidad es:

- autenticar usuarios,
- mostrar la lista de VPS,
- exponer estado, métricas y alertas,
- permitir navegar por la experiencia del panel.

## Flujo general del sistema

```text
[Agente Python] -> [Backend NestJS] -> [PostgreSQL]
      |                     |
      |                     +-> [Frontend Angular]
      |
      +-> [SQLite local]
```

## Integración del agente con el backend

### Autenticación
El backend ya está preparado para recibir peticiones del agente mediante un token de agente, lo que permite identificar al VPS sin usar JWT de usuario.

### Endpoint principal para métricas
El backend expone el endpoint:

- POST /api/v1/agent/metricas

Este endpoint debe recibir información como:

- CPU,
- RAM usada y total,
- disco usado y total,
- requests por minuto,
- procesos activos,
- conexiones activas,
- estado general,
- versión del agente.

### Heartbeat
También existe el endpoint:

- POST /api/v1/agent/heartbeat

Sirve para indicar que el agente sigue vivo y conectado.

## Integración del backend con el frontend

El frontend se integra con el backend mediante peticiones HTTP REST. El flujo esperado es:

1. El usuario inicia sesión.
2. El frontend consume endpoints del backend para obtener información del usuario y sus VPS.
3. El backend devuelve datos como:
   - información del VPS,
   - estado de conexión,
   - métricas recientes,
   - alertas,
   - bloqueos y aislamientos.
4. El frontend renderiza esa información en la interfaz.

### Endpoints que normalmente se consumen desde el frontend

- Auth
  - login
  - registro
  - refresh token

- VPS
  - listar VPS
  - obtener detalle de un VPS
  - obtener estado del VPS
  - crear/editar/eliminar VPS

## Recomendaciones de diseño para la integración

### Seguridad

- usar HTTPS en producción,
- nunca exponer tokens del agente en el frontend,
- validar todas las peticiones en el backend,
- usar autenticación JWT para usuarios del frontend.

### Confiabilidad

- el agente debe persistir localmente antes de enviar,
- el backend debe validar y almacenar los datos de forma consistente,
- el frontend debe manejar errores de red y estados de carga.

### Arquitectura de consumo en frontend

Se recomienda que el frontend centralice toda la comunicación con el backend en servicios, por ejemplo:

- AuthService
- VpsService
- MetricsService
- AlertsService

Esto evita mezclar lógica HTTP con componentes y deja la aplicación más mantenible.

## Flujo completo recomendado

```text
[Usuario] -> [Frontend Angular]
                  |
                  v
            [Backend NestJS]
                  |
                  v
            [PostgreSQL]

[Agente Python] -> [Backend NestJS]
```

## Qué debe completarse para que la integración quede operativa

1. Implementar el envío de métricas desde el agente al backend.
2. Validar el payload del agente contra el DTO del backend.
3. Consumir los endpoints del backend desde el frontend.
4. Mostrar el estado y las métricas en la interfaz.
5. Manejar estados de carga, errores y reconexión.

## Nota importante

En el estado actual del repositorio, el backend ya tiene la estructura para recibir métricas y heartbeats, y el frontend ya está preparado para consumir datos desde la capa web. Lo que falta para cerrar la integración completa es completar el envío real desde el agente y el consumo de esos datos desde la interfaz.
