import { Routes } from '@angular/router';


// pages
import { AppIconsComponent } from './icons/icons.component';
import { AppSamplePageComponent } from './sample-page/sample-page.component';
import { CarritoComponent } from './carrito/carrito';
import { CatalogoComponent } from './catalogo/catalogo';
import { ComparadorComponent } from './comparador/comparador';



export const ExtraRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'icons',
        component: AppIconsComponent,
      },
      {
        path: 'sample-page',
        component: AppSamplePageComponent,
      },
      {
        path: 'carrito',
        component: CarritoComponent,
      },
      {
        path: 'catalogo',
        component: CatalogoComponent,
      },
      {
        path: 'comparador',
        component: ComparadorComponent,
      },


    ],
  },
];
