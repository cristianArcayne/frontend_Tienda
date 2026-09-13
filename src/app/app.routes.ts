import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { BitacoraComponent } from './features/bitacora/bitacora.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { VestidorComponent } from './features/cliente/vestidor.component';
import { UsuariosComponent } from './features/usuarios/usuarios.component';
import { ConfiguracionComponent } from './features/configuracion/configuracion.component';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login'
  },
  {
    path: 'auth/login',
    component: LoginComponent
  },
  {
    path: 'auth/forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'auth/register',
    component: RegisterComponent
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard, roleGuard(['administrador', 'trabajador', 'empleado'])]
  },
  {
    path: 'usuarios',
    component: UsuariosComponent,
    canActivate: [authGuard, roleGuard(['administrador'])]
  },
  {
    path: 'configuracion',
    component: ConfiguracionComponent,
    canActivate: [authGuard, roleGuard(['administrador'])]
  },
  {
    path: 'bitacora',
    component: BitacoraComponent,
    canActivate: [authGuard, roleGuard(['administrador', 'trabajador', 'empleado'])]
  },
  {
    path: 'vestidor',
    component: VestidorComponent,
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
