src/app/
├── core/                   # El "Corazón" (Singleton Services)
│   ├── services/
│   │   ├── auth.service.ts       # Manejo del login/token
│   │   ├── socket.service.ts     # Conexión WebSocket para los ataques de tipo
│   │   └── guard.service.ts      # AuthGuard
│   └── models/                   # Interfaces (Attack, User, Log)
│
├── shared/                 # Componentes "Muditos" (Reutilizables)
│   ├── components/
│   │   ├── alert-card/           # La tarjetita roja/naranja de ataques
│   │   ├── status-badge/         # El "Online/Offline" del firewall
│   │   └── button/               # Estilos neón personalizados
│   └── pipes/                    # Ej: formatear el tipo de ataque
│
├── features/               # Las "Pantallas" o Funcionalidades
│   ├── auth/
│   │   └── login/                # Componente de Login
│   ├── dashboard/
│   │   ├── components/           # Componentes exclusivos del dashboard
│   │   │   ├── threat-map/       # El mapa de calor
│   │   │   └── attack-table/     # La lista de ataques en tiempo real
│   │   └── dashboard.component.ts
│   └── ai-assistant/             # Interfaz del chat con LUMI
│
└── layout/                 # El "Esqueleto" visual
    ├── sidebar/                  # Navegación lateral
    └── header/                   # Barra superior con perfil y alertas rápidas