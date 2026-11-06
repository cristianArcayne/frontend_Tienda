import { Routes } from '@angular/router';
import { EmpresaInicioComponent } from './inicio/inicio.component';
import { EmpresaRegistroComponent } from './registro/registro.component';

export const EmpresaPublicRoutes: Routes = [
  {
    path: '',
    component: EmpresaInicioComponent,
    data: {
      title: 'FashionStore SaaS'
    }
  },
  {
    path: 'empresa/inicio',
    component: EmpresaInicioComponent,
    data: {
      title: 'FashionStore SaaS'
    }
  },
  {
    path: 'empresa',
    component: EmpresaInicioComponent,
    data: {
      title: 'FashionStore SaaS'
    }
  },
  {
    path: 'planes',
    component: EmpresaInicioComponent,
    data: {
      title: 'Planes - FashionStore SaaS'
    }
  },
  {
    path: 'empresa/registro',
    component: EmpresaRegistroComponent,
    data: {
      title: 'Registro de Empresa - FashionStore SaaS'
    }
  },
  {
    path: 'registro-empresa',
    component: EmpresaRegistroComponent,
    data: {
      title: 'Registro de Empresa - FashionStore SaaS'
    }
  }
];
