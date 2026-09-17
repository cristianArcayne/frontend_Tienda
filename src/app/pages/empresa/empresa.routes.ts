import { Routes } from '@angular/router';
import { EmpresaInicioComponent } from './inicio/inicio.component';
import { EmpresaRegistroComponent } from './registro/registro.component';

export const EmpresaPublicRoutes: Routes = [
  {
    path: '',
    component: EmpresaInicioComponent,
    data: {
      title: 'Kreativ-Flow'
    }
  },
  {
    path: 'empresa/registro',
    component: EmpresaRegistroComponent,
    data: {
      title: 'Registro de Empresa'
    }
  }
];
