import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    },
    {
        path: 'register',
        loadComponent: () =>
            import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
    },
    {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/shell/app-shell.component').then((m) => m.AppShellComponent),
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
            },
            {
                path: 'vps',
                loadComponent: () =>
                    import('./features/vps/vps-list/vps-list.component').then((m) => m.VpsListComponent),
            },
            {
                path: 'vps/:id',
                loadComponent: () =>
                    import('./features/vps/vps-detail/vps-detail.component').then((m) => m.VpsDetailComponent),
            },
            {
                path: 'alertas',
                loadComponent: () =>
                    import('./features/alertas/alertas-historial/alertas-historial.component').then((m) => m.AlertasHistorialComponent),
            },
            {
                path: 'bloqueos',
                loadComponent: () =>
                    import('./features/bloqueos/bloqueos-historial/bloqueos-historial.component').then((m) => m.BloqueosHistorialComponent),
            },
            {
                path: 'whitelist',
                loadComponent: () =>
                    import('./features/whitelist/whitelist.component').then((m) => m.WhitelistComponent),
            },
            {
                path: 'configuracion',
                loadComponent: () =>
                    import('./features/configuracion/configuracion.component').then((m) => m.ConfiguracionComponent),
            },
            {
                path: 'nosotros',
                loadComponent: () =>
                    import('./features/nosotros/nosotros.component').then((m) => m.NosotrosComponent),
            },
        ],
    },
];
