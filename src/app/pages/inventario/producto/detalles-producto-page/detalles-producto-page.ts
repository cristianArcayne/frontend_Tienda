import { Component, OnDestroy, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { ConfigService } from '../../../../services/config.service';
import { ApiService } from '../../../../services/api.service';
import { CartService } from '../../../../services/cart.service';
import { FavoritosService } from '../../../../services/favoritos.service';
import { AuthService } from '../../../../services/auth.service';
import { PermisosService } from '../../../../services/permisos.service';
import { ResenasService } from '../../../../services/resenas.service';
import { Resena } from '../../../../models/inventario/resena.model';

import { Producto, Multimedia } from '../../../../models/inventario/producto.model';
import { VarianteProducto } from '../../../../models/inventario/variante.model';
import { Pagination } from '../../../../models/pagination.model';
import { CrearVarianteComponent } from '../../variante/crear-variante/crear-variante';
import { DetallesVarianteComponent } from '../../variante/detalles-variante/detalles-variante';
import { EliminarVarianteComponent } from '../../variante/eliminar-variante/eliminar-variante';
import { ImagenLightboxComponent } from './imagen-lightbox/imagen-lightbox.component';

@Component({
  selector: 'app-detalles-producto-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './detalles-producto-page.html',
  styleUrl: './detalles-producto-page.scss'
})
export class DetallesProductoPageComponent implements OnInit, OnDestroy {
  producto: Producto | null = null;
  variantes: VarianteProducto[] = [];
  productosRecomendados: Producto[] = [];
  isLoading = true;
  isLoadingVariantes = false;
  isLoadingRecomendados = false;
  isSaving = false;
  esFavorito = false;

  resenas: Resena[] = [];
  miResena: Resena | null = null;
  isLoadingResenas = false;
  nuevaCalificacion = 0;
  nuevoComentario = '';
  editandoResena = false;
  editCalificacion = 0;
  editComentario = '';
  guardandoResena = false;

  archivoSeleccionado: File | null = null;
  previewUrl: string | null = null;
  previewFileName: string | null = null;
  previewIsAr = false;
  imagenSeleccionadaIndex = -1;
  tipoMultimedia: 'imagen' | 'video' | 'realidad_aumentada' = 'imagen';

  private readonly columnasVarianteBase: string[] = ['sku', 'precio', 'cantidad'];
  private readonly columnasVarianteAdmin: string[] = ['costo_ponderado', 'limite_cantidad'];
  private readonly columnasVarianteAcciones: string[] = ['acciones'];

  private productoId: number;
  private destroy$ = new Subject<void>();
  private multimediaUrl: string;
  private variantesUrl: string;
  private productosUrl: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private cartService: CartService,
    private favoritosService: FavoritosService,
    private dialog: MatDialog,
    private authService: AuthService,
    public permisosService: PermisosService,
    private resenasService: ResenasService,
  ) {
    this.multimediaUrl = this.configService.getApiUrl('multimedios');
    this.variantesUrl = this.configService.getApiUrl('variantes');
    this.productosUrl = this.configService.getApiUrl('productos');
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.productoId = Number(params.get('id'));
        this.producto = null;
        this.variantes = [];
        this.productosRecomendados = [];
        this.resenas = [];
        this.miResena = null;
        this.imagenSeleccionadaIndex = -1;
        this.cargarProducto();
        this.cargarVariantes();
        this.cargarResenas();
      });

    this.favoritosService.favoritos$.subscribe(favoritos => {
      this.esFavorito = favoritos.some(f => f.producto_id === this.productoId);
    });
  }

  private cargarRecomendados(): void {
    this.isLoadingRecomendados = true;
    this.http.get<Producto[]>(`${this.productosUrl}${this.productoId}/recomendados/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (productos) => {
          this.productosRecomendados = productos;
          this.isLoadingRecomendados = false;
        },
        error: () => {
          this.isLoadingRecomendados = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarProducto(): void {
    this.isLoading = true;
    const url = this.configService.getApiUrl('productos-detalle');

    this.apiService.getById<Producto>(url, this.productoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (producto) => {
          this.producto = producto;
          this.establecerImagenSeleccionada();
          this.isLoading = false;
          this.cargarRecomendados();
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Error al cargar el producto', 'Cerrar', { duration: 5000 });
          this.router.navigate(['/inventario/productos']);
        }
      });
  }

  private cargarVariantes(): void {
    this.isLoadingVariantes = true;

    if (!this.permisosService.puedeVerVariante()) {
      this.isLoadingVariantes = false;
      return;
    }

    this.apiService.getWithPagination<VarianteProducto>(this.variantesUrl, 1, 100, { producto_id: this.productoId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.variantes = data.results;
          this.isLoadingVariantes = false;
        },
        error: () => {
          this.isLoadingVariantes = false;
        }
      });
  }

  volver(): void {
    this.router.navigate([this.isCliente ? '/extra/catalogo' : '/inventario/productos']);
  }

  get isCliente(): boolean {
    if (this.authService.isSuperuser()) {
      return false;
    }

    const roles = this.authService.getRoles();
    return roles.length === 1 && roles[0]?.toLowerCase() === 'cliente';
  }

  get displayedColumnsVariante(): string[] {
    if (this.isCliente) {
      return [...this.columnasVarianteBase, ...this.columnasVarianteAcciones];
    }

    return [...this.columnasVarianteBase, ...this.columnasVarianteAdmin, ...this.columnasVarianteAcciones];
  }

  getImagenPrincipalUrl(): string | null {
    if (!this.producto?.imagenes?.length) return null;
    const principal = this.producto.imagenes.find(i => i.es_principal);
    return principal ? principal.archivo_url : this.producto.imagenes[0].archivo_url;
  }

  getImagenSeleccionadaUrl(): string | null {
    if (!this.producto?.imagenes?.length || this.imagenSeleccionadaIndex < 0) return null;
    return this.producto.imagenes[this.imagenSeleccionadaIndex]?.archivo_url || null;
  }

  get modelo3dDisponible(): Multimedia | null {
    if (!this.producto?.modelos_3d?.length) return null;
    return this.producto.modelos_3d[0] || null;
  }

  seleccionarImagen(index: number): void {
    if (!this.producto?.imagenes?.length) return;
    if (index < 0 || index >= this.producto.imagenes.length) return;
    this.imagenSeleccionadaIndex = index;
  }

  abrirLightbox(index: number): void {
    if (!this.producto?.imagenes?.length) return;
    const total = this.producto.imagenes.length;
    const safeIndex = Math.max(0, Math.min(index, total - 1));
    this.seleccionarImagen(safeIndex);

    this.dialog.open(ImagenLightboxComponent, {
      width: '90vw',
      height: '80vh',
      maxWidth: '900px',
      autoFocus: false,
      data: {
        images: this.producto.imagenes,
        startIndex: safeIndex,
        title: this.producto.nombre
      }
    });
  }

  abrirModelo3d(): void {
    if (!this.modelo3dDisponible) return;
    this.dialog.open(ImagenLightboxComponent, {
      width: '90vw',
      height: '80vh',
      maxWidth: '900px',
      autoFocus: false,
      data: {
        images: [],
        startIndex: 0,
        title: 'Modelo 3D',
        modelUrl: this.modelo3dDisponible.archivo_url
      }
    });
  }

  siguienteImagen(): void {
    if (!this.producto?.imagenes?.length) return;
    this.imagenSeleccionadaIndex = (this.imagenSeleccionadaIndex + 1) % this.producto.imagenes.length;
  }

  anteriorImagen(): void {
    if (!this.producto?.imagenes?.length) return;
    const total = this.producto.imagenes.length;
    this.imagenSeleccionadaIndex = (this.imagenSeleccionadaIndex - 1 + total) % total;
  }

  private establecerImagenSeleccionada(): void {
    if (!this.producto?.imagenes?.length) {
      this.imagenSeleccionadaIndex = -1;
      return;
    }

    const principalIndex = this.producto.imagenes.findIndex(i => i.es_principal);
    this.imagenSeleccionadaIndex = principalIndex >= 0 ? principalIndex : 0;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!this.esTipoArchivoValido(file)) {
        const mensaje = this.tipoMultimedia === 'video'
          ? 'Selecciona un video valido'
          : this.tipoMultimedia === 'realidad_aumentada'
            ? 'Selecciona un archivo valido'
            : 'Selecciona una imagen (JPEG, PNG, WebP)';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
        return;
      }
      this.archivoSeleccionado = file;
      this.previewFileName = file.name;
      this.previewIsAr = this.tipoMultimedia === 'realidad_aumentada' && this.esArchivoAr(file);
      if (this.tipoMultimedia === 'imagen' || this.tipoMultimedia === 'video' || this.previewIsAr) {
        this.previewUrl = URL.createObjectURL(file);
      } else {
        this.previewUrl = null;
      }
    }
  }

  private esTipoArchivoValido(file: File): boolean {
    if (this.tipoMultimedia === 'video') {
      return file.type.startsWith('video/');
    }
    if (this.tipoMultimedia === 'realidad_aumentada') {
      return this.esArchivoAr(file);
    }
    return file.type.startsWith('image/');
  }

  private esArchivoAr(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith('.glb') || name.endsWith('.gltf');
  }

  agregarImagen(): void {
    if (!this.archivoSeleccionado || !this.producto) return;

    this.isSaving = true;
    const formData = new FormData();
    formData.append('archivo', this.archivoSeleccionado);
    formData.append('producto_id', String(this.producto.id));
    formData.append('tipo', this.tipoMultimedia);

    const orden = this.producto.imagenes ? this.producto.imagenes.length : 0;
    formData.append('es_principal', String(orden === 0));
    formData.append('orden', String(orden));

    this.http.post(this.multimediaUrl, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.snackBar.open('Imagen subida exitosamente', 'OK', { duration: 3000 });
          this.archivoSeleccionado = null;
          this.previewUrl = null;
          this.cargarProducto();
        },
        error: () => {
          this.isSaving = false;
          this.snackBar.open('Error al subir la imagen', 'Cerrar', { duration: 3000 });
        }
      });
  }

  eliminarImagen(imagen: Multimedia): void {
    this.isSaving = true;
    this.http.delete(`${this.multimediaUrl}${imagen.id}/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.snackBar.open('Imagen eliminada', 'OK', { duration: 3000 });
          this.cargarProducto();
        },
        error: () => {
          this.isSaving = false;
          this.snackBar.open('Error al eliminar imagen', 'Cerrar', { duration: 3000 });
        }
      });
  }

  establecerPrincipal(imagen: Multimedia): void {
    if (imagen.es_principal || !this.producto) return;

    this.isSaving = true;
    const updates = (this.producto.imagenes || [])
      .filter(img => img.es_principal !== (img.id === imagen.id))
      .map(img => this.http.patch(`${this.multimediaUrl}${img.id}/`, { es_principal: img.id === imagen.id }));

    if (updates.length === 0) {
      this.isSaving = false;
      return;
    }

    forkJoin(updates).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open('Imagen principal actualizada', 'OK', { duration: 3000 });
        this.cargarProducto();
      },
      error: () => {
        this.isSaving = false;
        this.snackBar.open('Error al actualizar', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cancelarSeleccion(): void {
    this.archivoSeleccionado = null;
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
    this.previewFileName = null;
    this.previewIsAr = false;
  }

  crearVariante(): void {
    const dialogRef = this.dialog.open(CrearVarianteComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { producto_id: this.productoId }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Variante creada exitosamente', 'OK', { duration: 3000 });
          this.cargarVariantes();
        }
      });
  }

  verVariante(variante: VarianteProducto): void {
    this.dialog.open(DetallesVarianteComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: { variante, ocultarCostos: this.isCliente }
    });
  }

  editarVariante(variante: VarianteProducto): void {
    const dialogRef = this.dialog.open(CrearVarianteComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { variante, producto_id: this.productoId }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Variante actualizada exitosamente', 'OK', { duration: 3000 });
          this.cargarVariantes();
        }
      });
  }

  eliminarVariante(variante: VarianteProducto): void {
    const dialogRef = this.dialog.open(EliminarVarianteComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: { variante }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.cargarVariantes();
        }
      });
  }
  
  toggleFavorito(): void {
    if (this.esFavorito) {
      this.favoritosService.eliminarPorProducto(this.productoId).subscribe();
    } else {
      this.favoritosService.agregar(this.productoId).subscribe({
        next: () => {
          this.snackBar.open('Producto agregado a favoritos', 'Cerrar', { duration: 2000 });
        },
        error: (err) => {
          this.snackBar.open(err.error?.error || 'Error al agregar a favoritos', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  agregarAlCarrito(variante: VarianteProducto): void {
    this.cartService.agregarProducto(variante.id, 1).subscribe({
      next: () => {
        this.snackBar.open('¡Producto añadido al carrito!', 'Ver Carrito', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        }).onAction().subscribe(() => {
          this.router.navigate(['/extra/carrito']);
        });
      },
      error: (err) => {
        const msg = err.error?.error || 'No se pudo añadir al carrito';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
      }
    });
  }

  private cargarResenas(): void {
    this.isLoadingResenas = true;
    this.resenasService.listarPorProducto(this.productoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.resenas = data.results;
          const username = this.authService.getCurrentAuthState().username;
          this.miResena = this.resenas.find(r => r.usuario_username === username) || null;
          this.isLoadingResenas = false;
        },
        error: () => { this.isLoadingResenas = false; }
      });
  }

  setNuevaCalificacion(valor: number): void {
    this.nuevaCalificacion = valor;
  }

  setEditCalificacion(valor: number): void {
    this.editCalificacion = valor;
  }

  enviarResena(): void {
    if (this.nuevaCalificacion < 1) {
      this.snackBar.open('Selecciona una calificación', 'Cerrar', { duration: 3000 });
      return;
    }
    this.guardandoResena = true;
    this.resenasService.crear({
      producto_id: this.productoId,
      calificacion: this.nuevaCalificacion,
      comentario: this.nuevoComentario,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.guardandoResena = false;
        this.nuevaCalificacion = 0;
        this.nuevoComentario = '';
        this.snackBar.open('Reseña enviada', 'OK', { duration: 3000 });
        this.cargarResenas();
      },
      error: (err) => {
        this.guardandoResena = false;
        this.snackBar.open(err.error?.detail || 'Error al enviar reseña', 'Cerrar', { duration: 4000 });
      }
    });
  }

  iniciarEdicion(): void {
    if (!this.miResena) return;
    this.editCalificacion = this.miResena.calificacion;
    this.editComentario = this.miResena.comentario;
    this.editandoResena = true;
  }

  cancelarEdicion(): void {
    this.editandoResena = false;
  }

  guardarEdicion(): void {
    if (!this.miResena || this.editCalificacion < 1) return;
    this.guardandoResena = true;
    this.resenasService.actualizar(this.miResena.id, {
      calificacion: this.editCalificacion,
      comentario: this.editComentario,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.guardandoResena = false;
        this.editandoResena = false;
        this.snackBar.open('Reseña actualizada', 'OK', { duration: 3000 });
        this.cargarResenas();
      },
      error: (err) => {
        this.guardandoResena = false;
        this.snackBar.open(err.error?.detail || 'Error al actualizar reseña', 'Cerrar', { duration: 4000 });
      }
    });
  }

  eliminarResena(): void {
    if (!this.miResena) return;
    this.guardandoResena = true;
    this.resenasService.eliminar(this.miResena.id)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.guardandoResena = false;
          this.snackBar.open('Reseña eliminada', 'OK', { duration: 3000 });
          this.cargarResenas();
        },
        error: () => {
          this.guardandoResena = false;
          this.snackBar.open('Error al eliminar reseña', 'Cerrar', { duration: 3000 });
        }
      });
  }

  getEstrellas(calificacion: number): string[] {
    const estrellas: string[] = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(calificacion)) {
        estrellas.push('star');
      } else if (i - calificacion < 1 && i - calificacion > 0) {
        estrellas.push('star_half');
      } else {
        estrellas.push('star_border');
      }
    }
    return estrellas;
  }

  get calificacionPromedio(): number | null {
    if (this.resenas.length === 0) return null;
    const sum = this.resenas.reduce((acc, r) => acc + r.calificacion, 0);
    return Math.round((sum / this.resenas.length) * 10) / 10;
  }
}

