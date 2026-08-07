# FrontLumi — README del frontend

## Qué hace

FrontLumi es la interfaz web del sistema LUMI. Su función es permitir a los usuarios ver el estado de sus VPS, autenticarse, navegar por el panel principal y consultar métricas y alertas generadas por el backend.

## Qué hace en la práctica

La aplicación permite:

- autenticar usuarios,
- mostrar el listado de VPS,
- ver el estado de salud de cada VPS,
- consultar alertas y bloqueos,
- navegar entre vistas de dashboard, autenticación y contenido general.

## Cómo lo hace

El frontend está construido con Angular 21 y sigue una estructura modular basada en módulos de características y capas compartidas.

### Arquitectura general

- App shell
  - configura la aplicación principal,
  - define rutas,
  - integra el layout general.
- Core
  - servicios reutilizables,
  - guards de protección,
  - lógica compartida del sistema.
- Features
  - módulos por dominio: auth, dashboard, about.
- Layout
  - estructura visual de navegación y shell principal.

## Dónde se ejecuta

El frontend se ejecuta en el navegador del usuario, normalmente en el puerto 4200 durante desarrollo.

## Requisitos

- Node.js
- npm
- Angular CLI 21

## Primeros pasos de instalación

1. Instalar dependencias

```bash
npm install
```

2. Ejecutar en modo desarrollo

```bash
npm start
```

O usando Angular CLI directamente:

```bash
ng serve
```

3. Abrir la aplicación

```text
http://localhost:4200/
```

## Cómo se ejecuta

### Desarrollo

```bash
npm start
```

### Build de producción

```bash
npm run build
```

## Tecnologías usadas

- Angular 21
- TypeScript
- RxJS
- Tailwind CSS
- Font Awesome
- Vitest para pruebas

## Estructura de carpetas relevante

```text
src/
  app/
    core/           # servicios, guards y lógica compartida
    features/       # módulos por dominio
    layout/         # estructura visual y navegación
    app.routes.ts   # configuración de rutas
```

## Integración con el backend

El frontend se integra con el backend a través de servicios HTTP. En una implementación completa, el flujo es:

1. El usuario se autentica.
2. El frontend envía requests al backend mediante HTTP.
3. El backend devuelve datos de VPS, alertas, métricas y estado.
4. El frontend renderiza esos datos en la interfaz.

## Buenas prácticas

- separar lógica de negocio en servicios,
- usar rutas protegidas para vistas sensibles,
- mantener los componentes simples y reutilizables,
- centralizar la comunicación con el backend en servicios específicos.
