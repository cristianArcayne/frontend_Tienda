# Sistema de Permisos - Guía de Implementación

## 📋 Permisos Definidos

### INVENTARIO

#### PRODUCTO
- `inventario.view_producto` - Ver productos
- `inventario.add_producto` - Crear productos
- `inventario.change_producto` - Editar productos
- `inventario.delete_producto` - Eliminar productos

#### CATEGORÍA
- `inventario.view_categoria` - Ver categorías
- `inventario.add_categoria` - Crear categorías
- `inventario.change_categoria` - Editar categorías
- `inventario.delete_categoria` - Eliminar categorías

#### PROVEEDOR
- `inventario.view_proveedor` - Ver proveedores
- `inventario.add_proveedor` - Crear proveedores
- `inventario.change_proveedor` - Editar proveedores
- `inventario.delete_proveedor` - Eliminar proveedores

#### MULTIMEDIA
- `inventario.view_multimedio` - Ver multimedia
- `inventario.add_multimedio` - Crear multimedia
- `inventario.change_multimedio` - Editar multimedia
- `inventario.delete_multimedio` - Eliminar multimedia

### SEGURIDAD

#### USUARIO
- `seguridad.view_usuario` - Ver usuarios
- `seguridad.add_usuario` - Crear usuarios
- `seguridad.change_usuario` - Editar usuarios
- `seguridad.delete_usuario` - Eliminar usuarios

#### GRUPO (ROL)
- `auth.view_group` - Ver roles
- `auth.add_group` - Crear roles
- `auth.change_group` - Editar roles
- `auth.delete_group` - Eliminar roles

#### PERMISO
- `auth.view_permission` - Ver permisos
- `auth.change_permission` - Editar permisos

---

## 🛡️ Cómo Usar

### 1. Proteger Rutas

```typescript
// En inventario.routes.ts o seguridad.routes.ts
import { Routes, inject } from '@angular/router';
import { PermisosService } from '../../services/permisos.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

const canAccessWithPermiso = (permisos: string | string[]) => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const permisosArray = Array.isArray(permisos) ? permisos : [permisos];

    if (authService.hasAnyPermiso(permisosArray)) {
      return true;
    }

    router.navigate(['/']);
    return false;
  };
};

export const InventarioRoutes: Routes = [
  {
    path: 'productos',
    component: ProductoComponent,
    canActivate: [canAccessWithPermiso(PermisosService.INVENTARIO_VIEW_PRODUCTO)]
  }
];
```

### 2. Usar en Componentes

```typescript
import { Component, OnInit } from '@angular/core';
import { PermisosService } from '../../../services/permisos.service';

@Component({
  selector: 'app-producto',
  template: `
    <button *ngIf="puedeCrear" (click)="crear()">
      Crear Producto
    </button>
  `,
  standalone: true
})
export class ProductoComponent implements OnInit {
  puedeVer = false;
  puedeCrear = false;
  puedeEditar = false;
  puedeEliminar = false;

  constructor(private permisosService: PermisosService) {}

  ngOnInit() {
    // Verificar permisos
    this.puedeVer = this.permisosService.puedeVerProducto();
    this.puedeCrear = this.permisosService.puedeCrearProducto();
    this.puedeEditar = this.permisosService.puedeEditarProducto();
    this.puedeEliminar = this.permisosService.puedeEliminarProducto();
  }

  crear() {
    if (!this.puedeCrear) {
      this.snackBar.open('No tienes permiso para crear', 'Cerrar');
      return;
    }
    // Lógica para crear
  }
}
```

### 3. Métodos del PermisosService

```typescript
// Métodos genéricos
permisosService.tiene('inventario.view_producto')           // Verificar un permiso
permisosService.tieneAlguno(['inventario.add_producto', ...]) // Verificar varios
permisosService.tieneTodos(['inventario.add_producto', ...])  // Verificar todos

// Métodos de conveniencia para PRODUCTO
permisosService.puedeVerProducto()
permisosService.puedeCrearProducto()
permisosService.puedeEditarProducto()
permisosService.puedeEliminarProducto()

// Métodos de conveniencia para CATEGORÍA
permisosService.puedeVerCategoria()
permisosService.puedeCrearCategoria()
permisosService.puedeEditarCategoria()
permisosService.puedeEliminarCategoria()

// Métodos de conveniencia para PROVEEDOR
permisosService.puedeVerProveedor()
permisosService.puedeCrearProveedor()
permisosService.puedeEditarProveedor()
permisosService.puedeEliminarProveedor()

// Métodos de conveniencia para USUARIO
permisosService.puedeVerUsuario()
permisosService.puedeCrearUsuario()
permisosService.puedeEditarUsuario()
permisosService.puedeEliminarUsuario()

// Métodos de conveniencia para ROL
permisosService.puedeVerRol()
permisosService.puedeCrearRol()
permisosService.puedeEditarRol()
permisosService.puedeEliminarRol()
```

### 4. Sidebar - Mostrar/Ocultar Items

Los items del sidebar se ocultan automáticamente si el usuario no tiene permisos:

```typescript
// En sidebar-data.ts
export const navItems: NavItem[] = [
  {
    displayName: 'Productos',
    iconName: 'solar:shop-2-line-duotone',
    route: '/inventario/productos',
    permiso: PermisosService.INVENTARIO_VIEW_PRODUCTO  // Solo se muestra si tiene permiso
  }
];
```

### 5. Verificar Permisos en Modales

```typescript
crearProducto() {
  if (!this.puedeCrear) {
    this.snackBar.open('No tienes permiso para crear productos', 'Cerrar');
    return;
  }

  const dialogRef = this.dialog.open(CrearProductoComponent, {
    width: '600px'
  });
  // ...
}
```

---

## 📝 Ejemplo Completo: Componente con Permisos

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { PermisosService } from '../../../services/permisos.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-ejemplo',
  template: `
    <mat-card>
      <mat-card-header>
        <div style="display: flex; justify-content: space-between;">
          <mat-card-title>Gestión de Items</mat-card-title>
          <button 
            *ngIf="puedeCrear"
            mat-raised-button 
            color="primary" 
            (click)="crear()">
            Crear
          </button>
        </div>
      </mat-card-header>

      <mat-card-content>
        <div *ngIf="!puedeVer" style="text-align: center; padding: 40px;">
          <p>No tienes permiso para acceder a esta sección</p>
        </div>

        <table *ngIf="puedeVer" mat-table [dataSource]="items">
          <!-- ... columnas de tabla ... -->
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let element">
              <button 
                *ngIf="puedeEditar"
                mat-icon-button 
                (click)="editar(element)">
                <mat-icon>edit</mat-icon>
              </button>
              <button 
                *ngIf="puedeEliminar"
                mat-icon-button 
                (click)="eliminar(element)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>
        </table>
      </mat-card-content>
    </mat-card>
  `,
  standalone: true
})
export class EjemploComponent implements OnInit, OnDestroy {
  items: any[] = [];
  
  puedeVer = false;
  puedeCrear = false;
  puedeEditar = false;
  puedeEliminar = false;

  private destroy$ = new Subject<void>();

  constructor(
    private permisosService: PermisosService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.verificarPermisos();
    if (this.puedeVer) {
      this.cargarItems();
    }
  }

  private verificarPermisos() {
    this.puedeVer = this.permisosService.puedeVerProducto();
    this.puedeCrear = this.permisosService.puedeCrearProducto();
    this.puedeEditar = this.permisosService.puedeEditarProducto();
    this.puedeEliminar = this.permisosService.puedeEliminarProducto();
  }

  private cargarItems() {
    // Cargar datos...
  }

  crear() {
    if (!this.puedeCrear) {
      this.snackBar.open('No tienes permiso', 'Cerrar');
      return;
    }
    // Lógica para crear...
  }

  editar(item: any) {
    if (!this.puedeEditar) {
      this.snackBar.open('No tienes permiso', 'Cerrar');
      return;
    }
    // Lógica para editar...
  }

  eliminar(item: any) {
    if (!this.puedeEliminar) {
      this.snackBar.open('No tienes permiso', 'Cerrar');
      return;
    }
    // Lógica para eliminar...
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## 🔐 Verificación de Permisos en Backend

El backend debe validar los permisos en cada endpoint:

```python
# Django REST Framework
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from apps_privadas.inventario.models import Producto
from apps_privadas.inventario.serializers import ProductoSerializer

class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]

    def create(self, request, *args, **kwargs):
        # Backend verifica permiso: inventario.add_producto
        if not request.user.has_perm('inventario.add_producto'):
            raise PermissionDenied()
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Backend verifica permiso: inventario.delete_producto
        if not request.user.has_perm('inventario.delete_producto'):
            raise PermissionDenied()
        return super().destroy(request, *args, **kwargs)
```

---

## ✅ Checklist para Agregar Permisos a un Componente

- [ ] Inyectar `PermisosService` en el componente
- [ ] Crear propiedades `puedeVer`, `puedeCrear`, `puedeEditar`, `puedeEliminar`
- [ ] En `ngOnInit()`, llamar a `verificarPermisos()`
- [ ] En cada acción (crear, editar, eliminar), verificar el permiso
- [ ] En el template, usar `*ngIf="puede..."` para mostrar/ocultar botones
- [ ] Agregar `canActivate` en la ruta (si es necesario)
- [ ] Agregar `permiso` al item del sidebar (en `sidebar-data.ts`)
