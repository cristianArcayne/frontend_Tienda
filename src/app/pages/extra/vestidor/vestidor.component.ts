import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSliderModule } from '@angular/material/slider';
import { MatChipsModule } from '@angular/material/chips';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from 'src/app/services/config.service';
import { CartService } from 'src/app/services/cart.service';
import { CrearReservaDialogComponent } from '../../reservas/crear-reserva-dialog/crear-reserva-dialog.component';

export interface TexturaVariante {
  variante_id: number;
  talla: string;
  color_nombre: string;
  color_hex: string;
  cod_barra?: string;
}

export interface PrendaAR {
  ropa_id: number;
  nombre: string;
  categoria: string;
  precio: number;
  precio_promocional?: number | null;
  imagen_uri?: string;
  modelo_3d_uri: string;
  formato_3d: string;
  posicion_anclaje: string;
  escala_recomendada?: number[];
  dimensiones_aprox_cm?: {
    ancho: number;
    alto: number;
    profundidad: number;
  };
  texturas_disponibles?: TexturaVariante[];
  soporta_ar_flutter?: boolean;
}

export interface AjusteCorporal {
  ropa_id: number;
  talla_recomendada: string;
  porcentaje_calce: number;
  mensaje_ajuste: string;
  escala_avatar_sugerida: number[];
}

@Component({
  selector: 'app-vestidor-virtual',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTabsModule,
    MatSliderModule,
    MatChipsModule
  ],
  templateUrl: './vestidor.component.html',
  styleUrls: ['./vestidor.component.scss']
})
export class VestidorVirtualComponent implements OnInit, OnDestroy {
  @ViewChild('modelViewer') modelViewerRef!: ElementRef;

  // Pestaña activa (0: 3D AR, 1: Virtual Try-On IA)
  tabActivaIndex = 0;

  // Catálogo de Prendas con soporte 3D
  prendasAR: PrendaAR[] = [];
  prendaSeleccionada: PrendaAR | null = null;
  texturaSeleccionada: TexturaVariante | null = null;
  isLoadingPrendas = true;

  // Configuración del Visor 3D
  autoRotate = true;

  // Medidas Biométricas (CU-06)
  alturaCm: number = 175;
  pechoCm: number = 96;
  cinturaCm: number = 82;
  caderaCm: number = 98;
  calculandoAjuste = false;
  ajusteResultado: AjusteCorporal | null = null;

  // Foto y Generación IA (Virtual Try-On)
  fotoArchivo: File | null = null;
  fotoPreview: string | null = null;
  generandoImagen = false;
  resultadoImagen: string | null = null;
  resultadoMensaje: string = '';
  errorMensaje: string = '';

  private destroy$ = new Subject<void>();
  private apiBase: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private cartService: CartService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.apiBase = this.configService.getApiBaseUrl().replace('/api', '/api/v1');
  }

  ngOnInit(): void {
    this.cargarPrendasAR();

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['ropaId']) {
        const targetId = Number(params['ropaId']);
        this.intentarSeleccionarPorId(targetId);
      }
      if (params['tab'] === 'ia') {
        this.tabActivaIndex = 1;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarPrendasAR(): void {
    this.isLoadingPrendas = true;
    this.http.get<PrendaAR[]>(`${this.apiBase}/ar/catalogo-3d`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.prendasAR = data || [];
          this.isLoadingPrendas = false;

          // Si hay prendas y no se ha seleccionado ninguna, seleccionar la primera
          if (this.prendasAR.length > 0 && !this.prendaSeleccionada) {
            this.seleccionarPrenda(this.prendasAR[0]);
          }
        },
        error: () => {
          this.isLoadingPrendas = false;
          this.cargarDesdeCatalogoGeneral();
        }
      });
  }

  cargarDesdeCatalogoGeneral(): void {
    const url = this.configService.getApiUrl('catalogo');
    this.http.get<any>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const items = Array.isArray(res) ? res : (res?.results || []);
          this.prendasAR = items.map((p: any) => ({
            ropa_id: p.id,
            nombre: p.nombre,
            categoria: p.categoria_nombre || 'General',
            precio: p.precio_minimo || p.precio_base || 0,
            precio_promocional: p.precio_promocional,
            imagen_uri: p.imagen_principal,
            modelo_3d_uri: '/static/uploads/chaqueta_cuero_3d.glb',
            formato_3d: 'glb',
            posicion_anclaje: 'TORSO',
            dimensiones_aprox_cm: { ancho: 45, alto: 70, profundidad: 20 },
            texturas_disponibles: [
              { variante_id: p.id, talla: 'M', color_nombre: 'Azul Denim', color_hex: '#1E3A8A' },
              { variante_id: p.id + 1, talla: 'L', color_nombre: 'Negro Clásico', color_hex: '#000000' }
            ]
          }));

          if (this.prendasAR.length > 0 && !this.prendaSeleccionada) {
            this.seleccionarPrenda(this.prendasAR[0]);
          }
        },
        error: () => {
          this.snackBar.open('Error al cargar prendas para el vestidor virtual', 'Cerrar', { duration: 3000 });
        }
      });
  }

  intentarSeleccionarPorId(ropaId: number): void {
    const encontrada = this.prendasAR.find(p => p.ropa_id === ropaId);
    if (encontrada) {
      this.seleccionarPrenda(encontrada);
    }
  }

  seleccionarPrenda(prenda: PrendaAR): void {
    this.prendaSeleccionada = prenda;
    if (prenda.texturas_disponibles && prenda.texturas_disponibles.length > 0) {
      this.texturaSeleccionada = prenda.texturas_disponibles[0];
    } else {
      this.texturaSeleccionada = null;
    }
    // Reiniciar cálculo biométrico para la nueva prenda
    this.ajusteResultado = null;
    this.calcularAjusteBiometrico();
  }

  seleccionarTextura(tex: TexturaVariante): void {
    this.texturaSeleccionada = tex;
    this.snackBar.open(`Variante seleccionada: ${tex.color_nombre} (${tex.talla})`, 'OK', { duration: 2000 });
  }

  // --- Controles Visor 3D ---
  toggleAutoRotate(): void {
    this.autoRotate = !this.autoRotate;
  }

  resetCamara(): void {
    if (this.modelViewerRef?.nativeElement) {
      const viewer = this.modelViewerRef.nativeElement;
      viewer.cameraOrbit = '0deg 75deg 105%';
    }
  }

  activarAR(): void {
    if (this.modelViewerRef?.nativeElement) {
      const viewer = this.modelViewerRef.nativeElement;
      if (typeof viewer.activateAR === 'function') {
        viewer.activateAR();
      } else {
        this.snackBar.open('Modo AR WebXR activo. En dispositivos móviles se abrirá el visor inmersivo.', 'OK', { duration: 3500 });
      }
    }
  }

  // --- Validación Biométrica ---
  calcularAjusteBiometrico(): void {
    if (!this.prendaSeleccionada) return;
    this.calculandoAjuste = true;

    const payload = {
      ropa_id: this.prendaSeleccionada.ropa_id,
      altura_cm: Number(this.alturaCm),
      pecho_cm: Number(this.pechoCm),
      cintura_cm: Number(this.cinturaCm),
      cadera_cm: Number(this.caderaCm)
    };

    this.http.post<AjusteCorporal>(`${this.apiBase}/ar/validar-ajuste`, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.ajusteResultado = res;
          this.calculandoAjuste = false;
        },
        error: () => {
          this.calculandoAjuste = false;
          // Fallback ergonómico local
          let talla = 'M';
          let calce = 98;
          let msg = 'Talla M estándar ideal con caída natural y comodidad en movimiento.';
          if (this.pechoCm < 88 && this.cinturaCm < 74) {
            talla = 'S';
            calce = 95;
            msg = 'Ajuste Slim perfecto en pecho y hombros para tu complexión.';
          } else if (this.pechoCm > 112) {
            talla = 'XL';
            calce = 91;
            msg = 'Talla XL con espacio óptimo para máxima libertad.';
          } else if (this.pechoCm > 100) {
            talla = 'L';
            calce = 94;
            msg = 'Talla L recomendada para un ajuste relajado y holgado.';
          }
          this.ajusteResultado = {
            ropa_id: this.prendaSeleccionada?.ropa_id || 1,
            talla_recomendada: talla,
            porcentaje_calce: calce,
            mensaje_ajuste: msg,
            escala_avatar_sugerida: [1.0, 1.0, 1.0]
          };
        }
      });
  }

  // --- Operaciones de Carrito y Reserva ---
  agregarAlCarrito(): void {
    if (!this.prendaSeleccionada) return;
    const varianteId = this.texturaSeleccionada?.variante_id ||
      (this.prendaSeleccionada.texturas_disponibles && this.prendaSeleccionada.texturas_disponibles[0]?.variante_id) ||
      this.prendaSeleccionada.ropa_id;

    this.cartService.agregarProducto(varianteId, 1).subscribe({
      next: () => {
        this.snackBar.open(`¡${this.prendaSeleccionada?.nombre} añadido al carrito!`, 'Ver Carrito', {
          duration: 3500,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        }).onAction().subscribe(() => {
          this.router.navigate(['/extra/carrito']);
        });
      },
      error: (err) => {
        this.snackBar.open(err.error?.detail || 'No se pudo añadir al carrito', 'Cerrar', { duration: 3000 });
      }
    });
  }

  iniciarReserva(): void {
    if (!this.prendaSeleccionada) return;
    const prodMock = {
      id: this.prendaSeleccionada.ropa_id,
      nombre: this.prendaSeleccionada.nombre,
      precio_minimo: this.prendaSeleccionada.precio,
      imagen_principal: this.prendaSeleccionada.imagen_uri
    };
    const dialogRef = this.dialog.open(CrearReservaDialogComponent, {
      width: '540px',
      maxWidth: '95vw',
      data: { producto: prodMock }
    });
    dialogRef.afterClosed().subscribe((creada) => {
      if (creada) {
        this.snackBar.open('¡Prenda reservada con éxito! Puedes gestionarla en Mis Reservas.', 'Ver Reservas', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        }).onAction().subscribe(() => {
          this.router.navigate(['/reservas']);
        });
      }
    });
  }

  // --- Virtual Try-On con IA ---
  onFotoSeleccionada(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      this.snackBar.open('La foto excede los 10 MB recomendados.', 'OK', { duration: 3000 });
      return;
    }

    this.fotoArchivo = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.fotoPreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  quitarFoto(): void {
    this.fotoArchivo = null;
    this.fotoPreview = null;
  }

  probarRopaConIA(): void {
    if (!this.fotoArchivo || !this.prendaSeleccionada) return;

    this.generandoImagen = true;
    this.errorMensaje = '';
    this.resultadoImagen = null;

    const formData = new FormData();
    formData.append('foto_usuario', this.fotoArchivo);
    formData.append('ropa_id', this.prendaSeleccionada.ropa_id.toString());

    this.http.post<any>(`${this.apiBase}/ar/try-on-ia`, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.generandoImagen = false;
          if (res.success && res.imagen_resultado) {
            this.resultadoImagen = res.imagen_resultado;
            this.resultadoMensaje = res.mensaje || '¡Resultado fotorrealista generado con IA!';
            this.snackBar.open('🎉 ¡Probador IA completado con éxito!', 'OK', { duration: 3500 });
          } else {
            this.errorMensaje = 'No se pudo generar la imagen. Intenta con una fotografía más nítida.';
          }
        },
        error: (err) => {
          this.generandoImagen = false;
          const detail = err.error?.detail || 'Error en pasarela de IA. Por favor, reintenta.';
          this.errorMensaje = detail;
          this.snackBar.open(detail, 'Cerrar', { duration: 5000 });
        }
      });
  }

  probarOtraFoto(): void {
    this.resultadoImagen = null;
    this.resultadoMensaje = '';
    this.fotoPreview = null;
    this.fotoArchivo = null;
  }

  descargarResultado(): void {
    if (!this.resultadoImagen) return;
    const link = document.createElement('a');
    link.href = this.resultadoImagen;
    link.download = `tryon-${this.prendaSeleccionada?.nombre?.replace(/\s+/g, '-') || 'resultado'}-${Date.now()}.png`;
    link.target = '_blank';
    link.click();
  }

  // --- Helpers de URLs y Assets ---
  get3DModelUrl(uri?: string | null): string {
    if (!uri) return 'http://localhost:8000/static/uploads/chaqueta_cuero_3d.glb';
    if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
    const base = this.configService.getApiBaseUrl().replace('/api', '');
    return `${base}${uri.startsWith('/') ? '' : '/'}${uri}`;
  }

  getImagenUrl(url?: string | null): string {
    if (!url) return 'assets/images/products/product-1.png';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const formatted = this.configService.formatImageUrl(url);
    return formatted || 'assets/images/products/product-1.png';
  }

  onImgError(event: any): void {
    if (event?.target && !event.target.src.includes('product-1.png')) {
      event.target.src = 'assets/images/products/product-1.png';
    }
  }

  irAlCatalogo(): void {
    this.router.navigate(['/extra/catalogo']);
  }
}
