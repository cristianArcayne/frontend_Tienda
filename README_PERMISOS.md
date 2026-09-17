# Guia de permisos (vistas y acciones)

Este documento explica como funciona el sistema de permisos para vistas y acciones (ver, crear, actualizar, eliminar) en el frontend.

## Flujo general

1. El backend devuelve la lista de permisos del usuario al hacer login.
2. `AuthService` guarda esos permisos en localStorage y en el estado de autenticacion.
3. `PermisosService` ofrece metodos para consultar permisos especificos o grupos de permisos.
4. Las rutas y los componentes usan esos metodos para permitir o bloquear vistas y acciones.

## Donde se guardan los permisos

- Los permisos se guardan en localStorage con la clave `auth_permisos`.
- El estado actual se expone con `authState$`.
- Un usuario superuser tiene acceso total.
- Si la lista de permisos contiene `*`, tambien se considera acceso total.

## Permisos por vista (rutas)

Para proteger una vista, se usa un guard que verifica permisos antes de activar la ruta.

```typescript
import { Routes } from '@angular/router';
import { permisoGuard } from './services/permiso.guard';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { PermisosService } from './services/permisos.service';

export const InventarioRoutes: Routes = [
  {
    path: 'productos',
    component: ProductoComponent,
    canActivate: [
      permisoGuard(AuthService, Router, PermisosService.INVENTARIO_VIEW_PRODUCTO)
    ]
  }
];
```

Notas:
- Si no tiene permiso, el guard redirige a `/`.
- Puedes pasar un permiso unico o un arreglo de permisos.

## Permisos por accion (crear, actualizar, eliminar)

En el componente, calcula flags para habilitar o bloquear acciones.

```typescript
import { Component, OnInit } from '@angular/core';
import { PermisosService } from '../services/permisos.service';

@Component({
  selector: 'app-producto',
  templateUrl: './producto.component.html'
})
export class ProductoComponent implements OnInit {
  puedeVer = false;
  puedeCrear = false;
  puedeEditar = false;
  puedeEliminar = false;

  constructor(private permisosService: PermisosService) {}

  ngOnInit(): void {
    this.puedeVer = this.permisosService.puedeVerProducto();
    this.puedeCrear = this.permisosService.puedeCrearProducto();
    this.puedeEditar = this.permisosService.puedeEditarProducto();
    this.puedeEliminar = this.permisosService.puedeEliminarProducto();
  }

  crear(): void {
    if (!this.puedeCrear) {
      return;
    }
    // crear producto...
  }
}
```

En el template, usa `*ngIf` para mostrar u ocultar botones:

```html
<button *ngIf="puedeCrear" (click)="crear()">Crear</button>
<button *ngIf="puedeEditar" (click)="editar()">Editar</button>
<button *ngIf="puedeEliminar" (click)="eliminar()">Eliminar</button>
```

## API de permisos disponible

Metodos genericos:

```typescript
permisosService.tiene('inventario.view_producto');
permisosService.tieneAlguno([
  'inventario.add_producto',
  'inventario.change_producto'
]);
permisosService.tieneTodos([
  'inventario.view_producto',
  'inventario.add_producto'
]);
```

Metodos de conveniencia (ejemplos):

```typescript
permisosService.puedeVerProducto();
permisosService.puedeCrearProducto();
permisosService.puedeEditarProducto();
permisosService.puedeEliminarProducto();
```

## Recomendaciones

- Valida permisos tanto en la vista como en la accion.
- No confies solo en el frontend: el backend debe validar permisos en cada endpoint.
- Centraliza permisos nuevos en `PermisosService` para mantener consistencia.
