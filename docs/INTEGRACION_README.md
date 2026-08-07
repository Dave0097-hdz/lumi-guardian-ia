# LUMI — Guía de integración entre agente y backend

## Objetivo

Este documento describe cómo debe integrarse el agente Python con el backend NestJS para que el sistema funcione como una plataforma completa de monitoreo y respuesta.

## Arquitectura de integración propuesta

### Componentes

- Agente Python: corre en el VPS cliente.
- Backend NestJS: recibe métricas, heartbeats y eventos.
- Base de datos PostgreSQL: almacena información del sistema.
- Frontend: consulta el estado de los VPS.

### Flujo general

1. El agente recolecta datos del VPS.
2. El agente los persiste localmente en SQLite.
3. El agente intenta enviarlos al backend vía HTTP.
4. El backend valida la autenticación del agente.
5. El backend guarda la información en PostgreSQL.
6. El frontend o la capa de negocio consulta el estado actualizado.

## Integración actual esperada

### 1. Autenticación del agente

El backend ya está preparado para recibir peticiones del agente con un guard de token de agente. Esto permite que un VPS se identifique sin usar JWT de usuario.

### 2. Envío de métricas

El endpoint esperado es:

- POST /api/v1/agent/metricas

Este endpoint debe recibir un payload con información como:

- CPU,
- RAM usada y total,
- disco usado y total,
- requests por minuto,
- procesos activos,
- conexiones activas,
- estado general del host,
- versión del agente.

### 3. Heartbeat

El backend también expone:

- POST /api/v1/agent/heartbeat

Este endpoint sirve para indicar que el agente sigue vivo.

## Flujo recomendado de implementación

### Fase 1: métricas básicas

- recolectar CPU, RAM y disco,
- enviar cada cierto intervalo,
- almacenar en PostgreSQL desde el backend.

### Fase 2: alertas y estado

- detectar eventos sospechosos en el agente,
- enviar alertas al backend,
- mostrar el estado en la interfaz.

### Fase 3: acciones de respuesta

- bloquear IPs,
- desactivar accesos sospechosos,
- aplicar aislamiento o reglas de firewall,
- notificar al usuario.

## Recomendaciones de diseño

### Seguridad

- nunca exponer el token del agente en el frontend,
- usar HTTPS en producción,
- validar cada request en el backend,
- almacenar hashes de tokens en lugar de tokens planos.

### Confiabilidad

- si el backend está caído, el agente debe seguir guardando eventos localmente,
- implementar reintentos con backoff,
- priorizar no perder información crítica.

### Observabilidad

- registrar logs del agente y del backend,
- expedir métricas del propio sistema,
- monitorear latencia y errores de comunicación.

## Diagrama de flujo simple

```text
[Agente Python]
   └─> [SQLite local]
   └─> [POST /agent/metricas]
             └─> [NestJS Backend]
                     └─> [PostgreSQL]
                             └─> [Frontend / Dashboard]
```

## Qué debe hacerse para terminar la integración

1. Implementar el sender del agente hacia el backend.
2. Definir y enviar el payload correcto según el DTO del backend.
3. Validar que el token de agente sea aceptado por el guard.
4. Verificar la persistencia de métricas en PostgreSQL.
5. Añadir reintentos y manejo de errores.

## Nota importante

En el estado actual del repositorio, el backend ya tiene la estructura para recibir métricas y heartbeats, pero el agente Python debe completar la parte de envío periódico y el mapeo correcto del payload para que la integración quede operativa.
