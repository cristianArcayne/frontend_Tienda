import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from 'src/app/services/config.service';

export interface PrendaAR {
  ropa_id: number;
  nombre: string;
  categoria: string;
  precio: number;
  imagen_uri?: string;
  modelo_3d_uri: string;
  formato_3d: string;
  posicion_anclaje: string;
  dimensiones_aprox_cm: {
    ancho: number;
    alto: number;
    profundidad: number;
  };
  texturas_disponibles: any[];
}

@Component({
  selector: 'app-vestidor-virtual',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatProgressBarModule
  ],
  template: `
    <div class="vestidor-mobile">
      <!-- Header -->
      <div class="vestidor-header">
        <div class="header-top">
          <mat-icon class="header-icon">auto_awesome</mat-icon>
          <h2>Probador Virtual con IA</h2>
        </div>
        <p class="header-sub">Sube tu foto y mira cómo te queda la ropa al instante</p>
      </div>

      <!-- ===== PRENDA SELECCIONADA ===== -->
      <div *ngIf="prendaSeleccionadaNombre" class="prenda-card">
        <img [src]="getImagenUrl(prendaSeleccionadaImagen)" [alt]="prendaSeleccionadaNombre"
             class="prenda-img" (error)="onImgError($event)" />
        <div class="prenda-info">
          <span class="prenda-badge">Prenda seleccionada</span>
          <h3>{{ prendaSeleccionadaNombre }}</h3>
        </div>
        <button mat-icon-button class="cambiar-btn" (click)="cambiarPrenda()" matTooltip="Cambiar prenda">
          <mat-icon>swap_horiz</mat-icon>
        </button>
      </div>

      <!-- ===== SI NO HAY PRENDA, ELEGIR DEL CATÁLOGO ===== -->
      <div *ngIf="!prendaSeleccionadaNombre && !isLoading" class="elegir-section">
        <div class="elegir-header">
          <mat-icon>checkroom</mat-icon>
          <span>Primero elige una prenda para probarte</span>
        </div>

        <div *ngIf="prendasAR.length === 0 && !isLoadingPrendas" class="empty-prendas">
          <mat-icon>inventory_2</mat-icon>
          <p>No hay prendas disponibles con soporte IA</p>
          <button mat-stroked-button color="primary" (click)="irAlCatalogo()">
            <mat-icon>storefront</mat-icon>
            Ir al Catálogo
          </button>
        </div>

        <div class="prendas-grid" *ngIf="prendasAR.length > 0">
          <div *ngFor="let item of prendasAR" class="prenda-mini" (click)="seleccionarPrenda(item)">
            <img [src]="getImagenUrl(item.imagen_uri)" [alt]="item.nombre"
                 class="prenda-mini-img" (error)="onImgError($event)" />
            <div class="prenda-mini-info">
              <span class="prenda-mini-cat">{{ item.categoria }}</span>
              <span class="prenda-mini-name">{{ item.nombre }}</span>
              <span class="prenda-mini-price">Bs. {{ item.precio | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>

        <div *ngIf="isLoadingPrendas" class="loading-prendas">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Cargando prendas...</span>
        </div>
      </div>

      <!-- ===== LOADING PRINCIPAL ===== -->
      <div *ngIf="isLoading" class="loading-section">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Cargando...</p>
      </div>

      <!-- ===== SUBIR FOTO ===== -->
      <div *ngIf="prendaSeleccionadaNombre && !resultadoImagen" class="upload-section">

        <!-- Preview de foto -->
        <div *ngIf="fotoPreview" class="foto-preview-container">
          <img [src]="fotoPreview" alt="Tu foto" class="foto-preview" />
          <button mat-icon-button class="remove-foto" (click)="quitarFoto()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Botón subir foto -->
        <div *ngIf="!fotoPreview" class="upload-area" (click)="fileInput.click()">
          <mat-icon class="upload-icon">add_a_photo</mat-icon>
          <h3>Sube tu foto</h3>
          <p>Toca para tomar una foto o elegir de tu galería</p>
          <span class="upload-hint">JPG o PNG • Foto de cuerpo completo</span>
        </div>

        <input #fileInput type="file" accept="image/jpeg,image/png,image/webp"
               capture="user" (change)="onFotoSeleccionada($event)" style="display: none;" />

        <!-- Botón probar -->
        <button *ngIf="fotoPreview" mat-raised-button color="primary"
                class="btn-probar" [disabled]="generandoImagen"
                (click)="probarRopaConIA()">
          <mat-icon *ngIf="!generandoImagen">auto_awesome</mat-icon>
          <mat-spinner *ngIf="generandoImagen" diameter="22" class="spinner-white"></mat-spinner>
          {{ generandoImagen ? 'Generando imagen...' : '✨ Probar Ropa con IA' }}
        </button>

        <!-- Progress bar durante generación -->
        <div *ngIf="generandoImagen" class="progress-section">
          <mat-progress-bar mode="indeterminate" color="primary"></mat-progress-bar>
          <p class="progress-text">
            <mat-icon class="anim-pulse">auto_awesome</mat-icon>
            La IA está vistiendo tu foto con la prenda... esto puede tardar unos segundos
          </p>
        </div>
      </div>

      <!-- ===== RESULTADO ===== -->
      <div *ngIf="resultadoImagen" class="resultado-section">
        <div class="resultado-badge">
          <mat-icon>check_circle</mat-icon>
          <span>{{ resultadoMensaje }}</span>
        </div>

        <div class="resultado-img-container">
          <img [src]="resultadoImagen" alt="Resultado Try-On" class="resultado-img" />
        </div>

        <div class="resultado-actions">
          <button mat-raised-button color="primary" (click)="descargarResultado()">
            <mat-icon>download</mat-icon>
            Descargar
          </button>
          <button mat-stroked-button color="primary" (click)="probarOtraFoto()">
            <mat-icon>photo_camera</mat-icon>
            Otra foto
          </button>
          <button mat-stroked-button (click)="cambiarPrenda()">
            <mat-icon>checkroom</mat-icon>
            Otra prenda
          </button>
        </div>
      </div>

      <!-- ===== ERROR ===== -->
      <div *ngIf="errorMensaje" class="error-section">
        <mat-icon>error_outline</mat-icon>
        <p>{{ errorMensaje }}</p>
        <button mat-stroked-button color="primary" (click)="errorMensaje = ''">
          Entendido
        </button>
      </div>
    </div>
  `,
  styles: [`
    .vestidor-mobile {
      max-width: 480px;
      margin: 0 auto;
      padding: 16px;
      min-height: 100vh;
      background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
    }

    .vestidor-header {
      text-align: center;
      margin-bottom: 20px;
      padding: 20px 16px 16px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 20px;
      color: white;
    }
    .header-top {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .header-top h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
    }
    .header-icon { font-size: 28px; width: 28px; height: 28px; }
    .header-sub {
      margin: 6px 0 0;
      font-size: 13px;
      opacity: 0.9;
    }

    /* Prenda seleccionada */
    .prenda-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: white;
      border-radius: 16px;
      padding: 12px;
      margin-bottom: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      position: relative;
    }
    .prenda-img {
      width: 72px;
      height: 72px;
      object-fit: cover;
      border-radius: 12px;
      flex-shrink: 0;
    }
    .prenda-info {
      flex: 1;
      min-width: 0;
    }
    .prenda-badge {
      display: inline-block;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #6366f1;
      letter-spacing: 0.5px;
      background: #eef2ff;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .prenda-info h3 {
      margin: 4px 0 0;
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cambiar-btn {
      position: absolute;
      top: 8px;
      right: 8px;
    }

    /* Elegir prenda */
    .elegir-section {
      background: white;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .elegir-header {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #475569;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .prendas-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .prenda-mini {
      cursor: pointer;
      border-radius: 12px;
      overflow: hidden;
      background: #f8fafc;
      border: 2px solid transparent;
      transition: all 0.2s ease;
    }
    .prenda-mini:active, .prenda-mini:hover {
      border-color: #6366f1;
      transform: scale(0.97);
    }
    .prenda-mini-img {
      width: 100%;
      height: 120px;
      object-fit: cover;
    }
    .prenda-mini-info {
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .prenda-mini-cat {
      font-size: 10px;
      text-transform: uppercase;
      color: #94a3b8;
      font-weight: 600;
    }
    .prenda-mini-name {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .prenda-mini-price {
      font-size: 13px;
      font-weight: 700;
      color: #6366f1;
    }
    .empty-prendas {
      text-align: center;
      padding: 24px 0;
      color: #94a3b8;
    }
    .empty-prendas mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .loading-prendas {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 24px 0;
      color: #64748b;
    }

    /* Loading */
    .loading-section {
      text-align: center;
      padding: 40px 0;
      color: #64748b;
    }

    /* Upload */
    .upload-section {
      margin-bottom: 16px;
    }
    .upload-area {
      background: white;
      border: 2px dashed #c7d2fe;
      border-radius: 20px;
      padding: 40px 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 16px;
    }
    .upload-area:active {
      border-color: #6366f1;
      background: #eef2ff;
    }
    .upload-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: #6366f1;
      margin-bottom: 8px;
    }
    .upload-area h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }
    .upload-area p {
      margin: 4px 0 8px;
      font-size: 14px;
      color: #64748b;
    }
    .upload-hint {
      font-size: 12px;
      color: #94a3b8;
      background: #f1f5f9;
      padding: 4px 12px;
      border-radius: 8px;
    }

    /* Foto preview */
    .foto-preview-container {
      position: relative;
      margin-bottom: 16px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    }
    .foto-preview {
      width: 100%;
      max-height: 400px;
      object-fit: cover;
      display: block;
    }
    .remove-foto {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(0,0,0,0.6) !important;
      color: white !important;
    }

    /* Botón probar */
    .btn-probar {
      width: 100%;
      height: 54px;
      font-size: 17px;
      font-weight: 700;
      border-radius: 16px !important;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
    }
    .spinner-white ::ng-deep circle {
      stroke: white !important;
    }

    /* Progress */
    .progress-section {
      background: white;
      border-radius: 16px;
      padding: 16px;
      text-align: center;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .progress-text {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 12px 0 0;
      font-size: 13px;
      color: #6366f1;
      font-weight: 500;
    }
    .anim-pulse {
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* Resultado */
    .resultado-section {
      margin-bottom: 16px;
    }
    .resultado-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #dcfce7;
      color: #15803d;
      padding: 10px 16px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .resultado-img-container {
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      margin-bottom: 16px;
    }
    .resultado-img {
      width: 100%;
      display: block;
    }
    .resultado-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .resultado-actions button {
      flex: 1;
      min-width: 100px;
      border-radius: 12px !important;
      height: 44px;
      font-weight: 600;
    }

    /* Error */
    .error-section {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      color: #dc2626;
      margin-bottom: 16px;
    }
    .error-section mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .error-section p { margin: 8px 0 12px; font-size: 14px; color: #991b1b; }
  `]
})
export class VestidorVirtualComponent implements OnInit, OnDestroy {
  // Prenda seleccionada desde el catálogo
  prendaSeleccionadaId: number | null = null;
  prendaSeleccionadaNombre: string = '';
  prendaSeleccionadaImagen: string = '';

  // Catálogo de prendas (si no viene preseleccionada)
  prendasAR: PrendaAR[] = [];
  isLoadingPrendas = false;

  // Foto del usuario
  fotoArchivo: File | null = null;
  fotoPreview: string | null = null;

  // Resultado de IA
  generandoImagen = false;
  resultadoImagen: string | null = null;
  resultadoMensaje: string = '';
  errorMensaje: string = '';

  isLoading = false;

  private destroy$ = new Subject<void>();
  private apiBase: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.apiBase = this.configService.getApiBaseUrl().replace('/api', '/api/v1');
  }

  ngOnInit(): void {
    // Leer queryParams del catálogo
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['ropaId']) {
        this.prendaSeleccionadaId = Number(params['ropaId']);
        this.prendaSeleccionadaNombre = params['ropaNombre'] || 'Prenda seleccionada';
        this.prendaSeleccionadaImagen = params['ropaImagen'] || '';
      }

      // Si no hay prenda preseleccionada, cargar catálogo
      if (!this.prendaSeleccionadaId) {
        this.cargarPrendasAR();
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
          this.prendasAR = data;
          this.isLoadingPrendas = false;
        },
        error: () => {
          this.isLoadingPrendas = false;
          // Cargar del catálogo general como fallback
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
            imagen_uri: p.imagen_principal,
            modelo_3d_uri: '',
            formato_3d: '',
            posicion_anclaje: '',
            dimensiones_aprox_cm: { ancho: 0, alto: 0, profundidad: 0 },
            texturas_disponibles: []
          }));
        },
        error: () => {}
      });
  }

  seleccionarPrenda(item: PrendaAR): void {
    this.prendaSeleccionadaId = item.ropa_id;
    this.prendaSeleccionadaNombre = item.nombre;
    this.prendaSeleccionadaImagen = item.imagen_uri || '';
  }

  cambiarPrenda(): void {
    this.prendaSeleccionadaId = null;
    this.prendaSeleccionadaNombre = '';
    this.prendaSeleccionadaImagen = '';
    this.resultadoImagen = null;
    this.fotoPreview = null;
    this.fotoArchivo = null;
    this.errorMensaje = '';

    if (this.prendasAR.length === 0) {
      this.cargarPrendasAR();
    }
  }

  onFotoSeleccionada(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamaño (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.snackBar.open('La foto es muy grande. Máximo 10 MB.', 'OK', { duration: 3000 });
      return;
    }

    this.fotoArchivo = file;

    // Generar preview
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
    if (!this.fotoArchivo || !this.prendaSeleccionadaId) return;

    this.generandoImagen = true;
    this.errorMensaje = '';
    this.resultadoImagen = null;

    const formData = new FormData();
    formData.append('foto_usuario', this.fotoArchivo);
    formData.append('ropa_id', this.prendaSeleccionadaId.toString());

    this.http.post<any>(`${this.apiBase}/ar/try-on-ia`, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.generandoImagen = false;
          if (res.success && res.imagen_resultado) {
            this.resultadoImagen = res.imagen_resultado;
            this.resultadoMensaje = res.mensaje || '¡Así te queda! Generado con IA';
            this.snackBar.open('🎉 ¡Imagen generada con éxito!', 'OK', { duration: 3000 });
          } else {
            this.errorMensaje = 'No se pudo generar la imagen. Intenta con otra foto.';
          }
        },
        error: (err) => {
          this.generandoImagen = false;
          const detail = err.error?.detail || 'Error al generar la imagen. Intenta de nuevo.';
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
    link.download = `tryon-${this.prendaSeleccionadaNombre?.replace(/\s+/g, '-') || 'resultado'}-${Date.now()}.png`;
    link.target = '_blank';
    link.click();
  }

  irAlCatalogo(): void {
    this.router.navigate(['/extra/catalogo']);
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
}
