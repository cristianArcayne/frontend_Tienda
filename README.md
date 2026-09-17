# Frontend Tienda - Proyecto Angular

Aplicación frontend desarrollada con **Angular 19** y **Angular Material** para la gestión de una tienda en línea. Incluye módulos de seguridad, administración de usuarios, roles y más.

## 📋 Tabla de Contenidos

- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Sistema de Rutas](#sistema-de-rutas)
- [Modelos (Models)](#modelos-models)
- [Servicios](#servicios)
- [Cómo Crear Nuevos Módulos](#cómo-crear-nuevos-módulos)

---

## 📦 Requisitos

Antes de comenzar, asegúrate de tener instalados:

- **Node.js** (v18+ recomendado)
- **npm** (v9+) o **yarn**
- **Angular CLI** v19

Puedes verificar las versiones con:

```bash
node --version
npm --version
ng version
```

---

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/frontend_tienda.git
cd frontend_tienda
```

### 2. Instalar Dependencias

```bash
npm install
```

Este comando instalará todos los paquetes necesarios definidos en `package.json`, incluyendo:

- **@angular/core**: Framework principal
- **@angular/material**: Componentes UI de Material Design
- **@angular/cdk**: Component Dev Kit (dependencia de Material)
- **rxjs**: Programación reactiva
- **ngx-scrollbar**: Barra de scroll personalizada
- **angular-tabler-icons**: Iconos Tabler

### 3. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto (opcional para desarrollo):

```env
ANGULAR_TENANT=tu-tenant
API_URL=http://localhost:8000/api
```

### 4. Ejecutar el Servidor de Desarrollo

```bash
ng serve
```

O con npm:

```bash
npm start
```

La aplicación estará disponible en `http://localhost:4200`

### 5. Compilar para Producción

```bash
ng build --configuration production
```

---

## 📂 Estructura del Proyecto

```
src/
├── app/
│   ├── components/          # Componentes reutilizables globales
│   ├── layouts/             # Layouts principales (full, blank)
│   ├── models/              # Interfaces TypeScript
│   │   └── seguridad/       # Modelos del módulo seguridad
│   │       ├── Usuario.model.ts
│   │       ├── rol.model.ts
│   │       ├── permisos.model.ts
│   │       └── login.model.ts
│   ├── pages/               # Módulos de páginas
│   │   ├── seguridad/       # Módulo de seguridad
│   │   │   ├── seguridad.routes.ts
│   │   │   ├── autenticacion/
│   │   │   ├── usuario/
│   │   │   ├── rol/
│   │   │   └── ...
│   │   ├── ui-components/   # Componentes UI
│   │   ├── extra/           # Páginas extras
│   │   └── pages.routes.ts
│   ├── services/            # Servicios
│   │   ├── api.service.ts
│   │   ├── auth.service.ts
│   │   ├── config.service.ts
│   │   └── ...
│   ├── app.routes.ts        # Rutas principales
│   ├── app.config.ts        # Configuración global
│   └── main.ts
├── assets/                  # Imágenes, estilos globales
├── styles.scss             # Estilos globales
└── index.html
```

---

## 🛣️ Sistema de Rutas

El proyecto utiliza **Lazy Loading** para cargar módulos bajo demanda, mejorando el rendimiento.

### Estructura de Rutas Principales (`app.routes.ts`)

```typescript
export const routes: Routes = [
  // Rutas SIN sidebar (login, registro)
  {
    path: '',
    component: BlankComponent,
    children: [
      { path: 'login', loadChildren: () => import('./pages/seguridad/seguridad.routes').then(m => m.SeguridadAuthRoutes) },
      { path: 'registrar', loadChildren: () => import('./pages/seguridad/seguridad.routes').then(m => m.SeguridadAuthRoutes) }
    ]
  },
  // Rutas CON sidebar (dashboard, admin)
  {
    path: '',
    component: FullComponent,
    children: [
      { path: '', loadChildren: () => import('./pages/pages.routes').then(m => m.PagesRoutes) },
      { path: 'seguridad', loadChildren: () => import('./pages/seguridad/seguridad.routes').then(m => m.SeguridadRoutes) },
      { path: 'ui-components', loadChildren: () => import('./pages/ui-components/ui-components.routes').then(m => m.UiComponentsRoutes) }
    ]
  }
];
```

### Rutas del Módulo Seguridad (`pages/seguridad/seguridad.routes.ts`)

```typescript
export const SeguridadRoutes: Routes = [
  {
    path: 'usuarios',
    component: UsuarioComponent
  },
  {
    path: 'roles',
    component: RolComponent
  }
];

export const SeguridadAuthRoutes: Routes = [
  {
    path: 'login',
    component: Autenticacion
  },
  {
    path: 'registrar',
    component: Autenticacion
  }
];
```

### Cómo Navegar

Dentro de componentes:

```typescript
constructor(private router: Router) {}

navegar(): void {
  this.router.navigate(['/seguridad/usuarios']);
}
```

En templates:

```html
<a routerLink="/seguridad/usuarios">Ir a Usuarios</a>
<button [routerLink]="['/seguridad/roles']">Ver Roles</button>
```

---

## 📊 Modelos (Models)

Los modelos son interfaces TypeScript que definen la estructura de datos.

### Ubicación y Organización

```
models/
├── pagination.model.ts           # Modelo genérico de paginación
├── seguridad/                    # Módulo seguridad
│   ├── Usuario.model.ts
│   ├── rol.model.ts
│   ├── permisos.model.ts
│   └── login.model.ts
└── administracion/               # (Ejemplo: Nuevo módulo)
    ├── Producto.model.ts
    ├── Categoria.model.ts
    └── Inventario.model.ts
```

### Ejemplo: Modelo de Usuario

**`models/seguridad/Usuario.model.ts`**

```typescript
export interface Usuario {
    id: number | null,
    username: string,
    nombre: string | null,
    apellido: string | null,
    grupos: string[] | null,
    is_superuser: boolean
}

export interface CrearUsuario {
    username: string;
    password: string | null;
    grupo_id: number;
}
```

### Cómo Crear Nuevos Modelos

1. **Crear carpeta del módulo** (si no existe):
   ```bash
   mkdir src/app/models/administracion
   ```

2. **Crear archivo de modelo**:
   ```typescript
   // src/app/models/administracion/Producto.model.ts
   export interface Producto {
       id: number;
       nombre: string;
       descripcion: string;
       precio: number;
       stock: number;
       categoria_id: number;
   }

   export interface CrearProducto {
       nombre: string;
       descripcion: string;
       precio: number;
       stock: number;
       categoria_id: number;
   }
   ```

3. **Usar en componentes**:
   ```typescript
   import { Producto } from 'src/app/models/administracion/Producto.model';
   ```

---

## 🔧 Servicios

### ApiService - Servicio Genérico CRUD

El `ApiService` proporciona métodos reutilizables para comunicarse con el backend usando Django REST Framework.

**Ubicación:** `src/app/services/api.service.ts`

#### Métodos Disponibles

```typescript
// GET con paginación
getWithPagination<T>(
  url: string,
  page: number = 1,
  pageSize: number = 10,
  filters?: Record<string, any>
): Observable<Pagination<T>>

// GET sin paginación
getAll<T>(url: string, filters?: Record<string, any>): Observable<T[]>

// GET por ID
getById<T>(url: string, id: number | string): Observable<T>

// POST - Crear
create<T>(url: string, data: any): Observable<T>

// PUT - Actualizar completo
update<T>(url: string, id: number | string, data: any): Observable<T>

// PATCH - Actualizar parcial
patch<T>(url: string, id: number | string, data: any): Observable<T>

// DELETE
delete<T>(url: string, id: number | string): Observable<T>

// GET siguiente página (desde URL)
getNextPage<T>(nextUrl: string): Observable<Pagination<T>>

// GET página anterior (desde URL)
getPreviousPage<T>(previousUrl: string): Observable<Pagination<T>>
```

#### Ejemplo de Uso en Componentes

```typescript
import { ApiService } from 'src/app/services/api.service';

export class UsuarioComponent implements OnInit {
  usuarios: Usuario[] = [];
  isLoading = false;

  constructor(
    private apiService: ApiService,
    private configService: ConfigService
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.isLoading = true;
    const url = this.configService.getApiUrl('usuarios');

    // GET con paginación
    this.apiService.getWithPagination<Usuario>(url, 1, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.usuarios = data.results;
          this.totalItems = data.count;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error:', error);
          this.isLoading = false;
        }
      });
  }

  crearUsuario(datos: CrearUsuario): void {
    const url = this.configService.getApiUrl('usuarios');

    // POST - Crear
    this.apiService.create(url, datos)
      .subscribe({
        next: (response) => {
          this.snackBar.open('Creado exitosamente', 'OK');
          this.cargarUsuarios();
        },
        error: (error) => {
          this.snackBar.open('Error al crear', 'Cerrar');
        }
      });
  }

  actualizarUsuario(id: number, datos: CrearUsuario): void {
    const url = this.configService.getApiUrl('usuarios');

    // PUT - Actualizar
    this.apiService.update(url, id, datos)
      .subscribe({
        next: () => {
          this.snackBar.open('Actualizado exitosamente', 'OK');
          this.cargarUsuarios();
        },
        error: (error) => console.error('Error:', error)
      });
  }

  eliminarUsuario(id: number): void {
    const url = this.configService.getApiUrl('usuarios');

    // DELETE
    this.apiService.delete(url, id)
      .subscribe({
        next: () => {
          this.snackBar.open('Eliminado exitosamente', 'OK');
          this.cargarUsuarios();
        },
        error: (error) => console.error('Error:', error)
      });
  }
}
```

### ConfigService

Proporciona URLs de API y configuración global.

```typescript
getApiUrl(endpoint: string): string
// Ejemplo: getApiUrl('usuarios') → 'http://api.example.com/usuarios/'

getCurrentTenant(): string
// Retorna el nombre del tenant actual
```

### AuthService

Maneja autenticación, tokens y estado de sesión.

```typescript
login(credentials: LoginRequest): Observable<LoginResponse>
logout(): Observable<void>
isAuthenticated(): boolean
getAccessToken(): string | null
getRefreshToken(): string | null
getCurrentUser(): Observable<{ username: string }>
```

---

## 🆕 Cómo Crear Nuevos Módulos

### Ejemplo: Crear Módulo "Administración"

#### Paso 1: Crear Estructura de Carpetas

```bash
mkdir -p src/app/pages/administracion
mkdir src/app/pages/administracion/producto
mkdir src/app/pages/administracion/categoria
mkdir src/app/models/administracion
```

#### Paso 2: Crear Modelos

**`src/app/models/administracion/Producto.model.ts`**

```typescript
export interface Producto {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    stock: number;
}

export interface CrearProducto {
    nombre: string;
    descripcion: string;
    precio: number;
    stock: number;
}
```

#### Paso 3: Crear Rutas

**`src/app/pages/administracion/administracion.routes.ts`**

```typescript
import { Routes } from '@angular/router';
import { ProductoComponent } from './producto/producto.component';
import { CategoriaComponent } from './categoria/categoria.component';

export const AdministracionRoutes: Routes = [
  {
    path: 'productos',
    component: ProductoComponent
  },
  {
    path: 'categorias',
    component: CategoriaComponent
  }
];
```

#### Paso 4: Registrar en Rutas Principales

**`src/app/app.routes.ts`**

```typescript
{
  path: 'administracion',
  loadChildren: () =>
    import('./pages/administracion/administracion.routes').then(
      (m) => m.AdministracionRoutes
    ),
}
```

#### Paso 5: Crear Componentes

**`src/app/pages/administracion/producto/producto.ts`**

```typescript
import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { ConfigService } from 'src/app/services/config.service';
import { Producto } from 'src/app/models/administracion/Producto.model';

@Component({
  selector: 'app-producto',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule],
  templateUrl: './producto.html',
  styleUrl: './producto.scss'
})
export class ProductoComponent implements OnInit {
  productos: Producto[] = [];

  constructor(
    private apiService: ApiService,
    private configService: ConfigService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    const url = this.configService.getApiUrl('productos');
    this.apiService.getAll<Producto>(url).subscribe({
      next: (data) => {
        this.productos = data;
      }
    });
  }
}
```

#### Paso 6: Agregar al Menú de Navegación

**`src/app/layouts/full/sidebar/sidebar-data.ts`**

```typescript
navItems = [
  {
    displayName: 'Seguridad',
    icon: 'lock',
    route: '/seguridad/usuarios',
    children: [
      { displayName: 'Usuarios', icon: 'users', route: '/seguridad/usuarios' },
      { displayName: 'Roles', icon: 'shield', route: '/seguridad/roles' }
    ]
  },
  {
    displayName: 'Administración',
    icon: 'settings',
    route: '/administracion/productos',
    children: [
      { displayName: 'Productos', icon: 'box', route: '/administracion/productos' },
      { displayName: 'Categorías', icon: 'folder', route: '/administracion/categorias' }
    ]
  }
];
```

---

## 📋 Patrones Comunes

### Componente con Tabla y Paginación

```typescript
export class ProductoComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'nombre', 'precio', 'stock', 'acciones'];
  dataSource: Producto[] = [];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.isLoading = true;
    const url = this.configService.getApiUrl('productos');

    this.apiService.getWithPagination<Producto>(url, this.currentPage + 1, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dataSource = data.results;
          this.totalItems = data.count;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error:', error);
          this.isLoading = false;
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.cargarProductos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## 🔐 Autenticación y Guards

### Guard de Autenticación

Se puede crear un guard para proteger rutas:

```typescript
import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}
```

Usar en rutas:

```typescript
{
  path: 'seguridad',
  canActivate: [AuthGuard],
  loadChildren: () => import('./pages/seguridad/seguridad.routes').then(m => m.SeguridadRoutes)
}
```

---

## 📚 Recursos Adicionales

- [Angular Docs](https://angular.io/docs)
- [Angular Material](https://material.angular.io)
- [RxJS Documentation](https://rxjs.dev)
- [Django REST Framework](https://www.django-rest-framework.org)

---

## 🤝 Contribuciones

Para contribuir al proyecto:

1. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
2. Haz cambios y commit: `git commit -m "Agrega nueva funcionalidad"`
3. Push a la rama: `git push origin feature/nueva-funcionalidad`
4. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver archivo `LICENSE` para más detalles.

---

**Última actualización:** 2026-04-09
**Versión:** 1.0.0
