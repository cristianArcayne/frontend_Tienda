import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import {
  CrearPromocionPayload,
  NotificacionPush,
  Promocion,
} from 'src/app/models/notificaciones.model';
import { Producto } from 'src/app/models/inventario/producto.model';
import { NotificacionesService } from 'src/app/services/notificaciones.service';
import { ApiService } from 'src/app/services/api.service';
import { ConfigService } from 'src/app/services/config.service';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  templateUrl: './notificaciones.html',
  styleUrl: './notificaciones.scss',
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  promociones: Promocion[] = [];
  notificaciones: NotificacionPush[] = [];
  productos: Producto[] = [];
  promocionesColumns = [
    'id',
    'titulo',
    'descripcion',
    'producto_nombre',
    'tipo_descuento',
    'valor_descuento',
    'estado',
    'fecha_inicio',
    'fecha_fin',
    'acciones',
  ];
  notificacionesColumns = ['usuario', 'endpoint', 'activa', 'ultima_promocion', 'ultimo_envio', 'ultimo_error'];

  isLoadingPromociones = false;
  isLoadingNotificaciones = false;
  isLoadingProductos = false;
  isSaving = false;
  isPublishingId: number | string | null = null;
  isPushBusy = false;
  pushSupported = false;
  pushPermission: NotificationPermission | 'unsupported' = 'unsupported';
  pushActiva = false;

  tiposDescuento = [
    { value: 'porcentaje', label: 'Porcentaje' },
    { value: 'monto_fijo', label: 'Monto fijo' },
  ];

  promocionForm = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: ['', [Validators.required, Validators.maxLength(500)]],
    producto: ['', Validators.required],
    tipo_descuento: ['porcentaje', Validators.required],
    valor_descuento: [0, [Validators.required, Validators.min(0)]],
    fecha_inicio: ['', Validators.required],
    fecha_fin: ['', Validators.required],
  });

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private notificacionesService: NotificacionesService,
    private snackBar: MatSnackBar,
    private apiService: ApiService,
    private configService: ConfigService
  ) {}

  ngOnInit(): void {
    this.checkPushState();
    this.loadProductos();
    this.loadPromociones();
    this.loadNotificaciones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPromociones(): void {
    this.isLoadingPromociones = true;
    this.notificacionesService.getPromociones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.promociones = this.getList(response);
          this.isLoadingPromociones = false;
        },
        error: (error) => {
          console.error('Error al cargar promociones:', error);
          this.snackBar.open('Error al cargar promociones', 'Cerrar', { duration: 5000 });
          this.isLoadingPromociones = false;
        },
      });
  }

  loadNotificaciones(): void {
    this.isLoadingNotificaciones = true;
    this.notificacionesService.getNotificaciones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notificaciones = this.getList(response);
          this.isLoadingNotificaciones = false;
        },
        error: (error) => {
          console.error('Error al cargar suscripciones:', error);
          this.snackBar.open('Error al cargar suscripciones push', 'Cerrar', { duration: 5000 });
          this.isLoadingNotificaciones = false;
        },
      });
  }

  loadProductos(): void {
    this.isLoadingProductos = true;
    this.apiService.getWithPagination<Producto>(
      this.configService.getApiUrl('productos'),
      1,
      100
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.productos = data.results;
          this.isLoadingProductos = false;
        },
        error: (error) => {
          console.error('Error al cargar productos:', error);
          this.productos = [];
          this.isLoadingProductos = false;
          this.snackBar.open('Error al cargar productos', 'Cerrar', { duration: 5000 });
        },
      });
  }

  crearPromocion(): void {
    if (this.promocionForm.invalid) {
      this.promocionForm.markAllAsTouched();
      this.snackBar.open('Completa los datos de la promocion', 'Cerrar', { duration: 3000 });
      return;
    }

    const raw = this.promocionForm.getRawValue();
    const payload: CrearPromocionPayload = {
      titulo: raw.titulo || '',
      descripcion: raw.descripcion || '',
      producto_id: raw.producto || '',
      tipo_descuento: raw.tipo_descuento || 'porcentaje',
      valor_descuento: Number(raw.valor_descuento || 0),
      fecha_inicio: this.toIsoDate(raw.fecha_inicio || ''),
      fecha_fin: this.toIsoDate(raw.fecha_fin || ''),
    };

    this.isSaving = true;
    this.notificacionesService.crearPromocion(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (promocion) => {
          this.isSaving = false;
          this.promociones = promocion ? [promocion, ...this.promociones] : this.promociones;
          this.snackBar.open('Promocion creada correctamente', 'OK', { duration: 3000 });
          this.promocionForm.reset({
            titulo: '',
            descripcion: '',
            producto: '',
            tipo_descuento: 'porcentaje',
            valor_descuento: 0,
            fecha_inicio: '',
            fecha_fin: '',
          });
          this.loadPromociones();
        },
        error: (error) => {
          console.error('Error al crear promocion:', error);
          this.isSaving = false;
          this.snackBar.open(this.getBackendError(error, 'No se pudo crear la promocion'), 'Cerrar', { duration: 6000 });
        },
      });
  }

  publicarPromocion(promocion: Promocion): void {
    if (!promocion.id) {
      return;
    }

    this.isPublishingId = promocion.id;
    this.notificacionesService.publicarPromocion(promocion.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isPublishingId = null;
          this.snackBar.open('Promocion publicada', 'OK', { duration: 3000 });
          this.loadPromociones();
          this.loadNotificaciones();
        },
        error: (error) => {
          console.error('Error al publicar promocion:', error);
          this.isPublishingId = null;
          this.snackBar.open('No se pudo publicar la promocion', 'Cerrar', { duration: 5000 });
        },
      });
  }

  async activarNotificaciones(): Promise<void> {
    if (!this.pushSupported) {
      this.snackBar.open('Este navegador no soporta notificaciones push', 'Cerrar', { duration: 4000 });
      return;
    }

    if (!window.isSecureContext) {
      this.snackBar.open('Push requiere HTTPS o localhost', 'Cerrar', { duration: 5000 });
      return;
    }

    this.isPushBusy = true;

    try {
      const permission = await Notification.requestPermission();
      this.pushPermission = permission;

      if (permission !== 'granted') {
        this.snackBar.open('Permiso de notificaciones no concedido', 'Cerrar', { duration: 4000 });
        this.isPushBusy = false;
        return;
      }

      const response = await this.notificacionesService.getVapidPublicKey();
      const publicKey =
        response?.['public_key'] ||
        response?.['publicKey'] ||
        response?.['vapid_public_key'] ||
        response?.['vapidPublicKey'];

      console.log('Notification.permission:', Notification.permission);
      console.log('window.isSecureContext:', window.isSecureContext);
      console.log('ServiceWorker soportado:', 'serviceWorker' in navigator);
      console.log('PushManager soportado:', 'PushManager' in window);
      console.log('VAPID response:', response);
      console.log('VAPID publicKey:', publicKey);

      if (!publicKey || typeof publicKey !== 'string' || !publicKey.trim()) {
        throw new Error(
          `No se recibio la clave publica VAPID. Campos recibidos: ${Object.keys(response || {}).join(', ')}`
        );
      }

      const subscription = await this.createPushSubscription(publicKey.trim());

      const json = subscription.toJSON();
      const keys = json.keys;

      if (!keys?.['p256dh'] || !keys?.['auth']) {
        throw new Error('La suscripcion push no devolvio llaves validas');
      }

      this.notificacionesService.suscribirse({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: keys['p256dh'],
          auth: keys['auth'],
        },
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.pushActiva = true;
            this.isPushBusy = false;
            this.snackBar.open('Notificaciones activadas', 'OK', { duration: 3000 });
            this.loadNotificaciones();
          },
          error: (error) => {
            console.error('Error al guardar suscripcion:', error);
            this.isPushBusy = false;
            this.snackBar.open('No se pudo guardar la suscripcion', 'Cerrar', { duration: 5000 });
          },
        });
    } catch (error) {
      this.logPushError(error);
      this.isPushBusy = false;
      this.snackBar.open(error instanceof Error ? error.message : 'No se pudo activar el push', 'Cerrar', { duration: 6000 });
    }
  }

  async desactivarNotificaciones(): Promise<void> {
    if (!this.pushSupported) {
      return;
    }

    this.isPushBusy = true;
    const registration = await this.getCurrentPushRegistration();
    const subscription = await registration?.pushManager.getSubscription();

    if (!subscription) {
      this.pushActiva = false;
      this.isPushBusy = false;
      this.snackBar.open('No hay suscripcion activa en este navegador', 'Cerrar', { duration: 3000 });
      return;
    }

    this.notificacionesService.desuscribirse(subscription.endpoint)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          await subscription.unsubscribe();
          this.pushActiva = false;
          this.isPushBusy = false;
          this.snackBar.open('Notificaciones desactivadas', 'OK', { duration: 3000 });
          this.loadNotificaciones();
        },
        error: (error) => {
          console.error('Error al desuscribir:', error);
          this.isPushBusy = false;
          this.snackBar.open('No se pudo desactivar la suscripcion', 'Cerrar', { duration: 5000 });
        },
      });
  }

  probarNotificacion(): void {
    this.isPushBusy = true;
    this.notificacionesService.probar({
      titulo: 'Prueba',
      mensaje: 'Las notificaciones funcionan',
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isPushBusy = false;
          this.snackBar.open('Notificacion de prueba enviada', 'OK', { duration: 3000 });
          this.loadNotificaciones();
        },
        error: (error) => {
          console.error('Error al probar notificacion:', error);
          this.isPushBusy = false;
          this.snackBar.open('No se pudo enviar la notificacion de prueba', 'Cerrar', { duration: 5000 });
        },
      });
  }

  getEstadoColor(estado?: string): 'primary' | 'accent' | 'warn' {
    const normalized = (estado || '').toLowerCase();

    if (normalized.includes('activa') || normalized.includes('public')) {
      return 'primary';
    }

    if (normalized.includes('error') || normalized.includes('inactiva')) {
      return 'warn';
    }

    return 'accent';
  }

  getDescuento(promocion: Promocion): string {
    const valor = promocion.valor_descuento ?? 0;
    return promocion.tipo_descuento?.toLowerCase() === 'porcentaje' ? `${valor}%` : `Bs ${valor}`;
  }

  getProductoNombre(promocion: Promocion): string {
    if (promocion.producto_nombre) {
      return promocion.producto_nombre;
    }

    const producto = this.productos.find((item) => String(item.id) === String(promocion.producto));
    return producto?.nombre || `Producto #${promocion.producto}`;
  }

  getEndpointCorto(endpoint: string): string {
    if (!endpoint) {
      return '-';
    }

    return endpoint.length > 48 ? `${endpoint.slice(0, 48)}...` : endpoint;
  }

  private async checkPushState(): Promise<void> {
    this.pushSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    this.pushPermission = this.pushSupported ? Notification.permission : 'unsupported';

    if (!this.pushSupported) {
      return;
    }

    const registration = await this.getCurrentPushRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    this.pushActiva = !!subscription;
  }

  private async getPushRegistration(): Promise<ServiceWorkerRegistration> {
    const scriptUrl = await this.getAvailablePushWorkerScript();
    return this.registerPushWorker(scriptUrl);
  }

  private async getCurrentPushRegistration(): Promise<ServiceWorkerRegistration | undefined> {
    const rootRegistration = await this.getRegistrationSafely('/');
    const assetsRegistration = await this.getRegistrationSafely('/assets/');

    return rootRegistration || assetsRegistration;
  }

  private async getRegistrationSafely(scope: string): Promise<ServiceWorkerRegistration | undefined> {
    try {
      return await navigator.serviceWorker.getRegistration(scope);
    } catch (error) {
      console.warn(`No se pudo consultar el service worker ${scope}:`, error);
      return undefined;
    }
  }

  private async getAvailablePushWorkerScript(): Promise<string> {
    const candidates = ['/push-sw.js', '/assets/push-sw.js'];

    for (const scriptUrl of candidates) {
      try {
        const response = await fetch(scriptUrl, { cache: 'no-store' });

        if (response.ok) {
          return scriptUrl;
        }
      } catch (error) {
        console.warn(`No se pudo verificar ${scriptUrl}:`, error);
      }
    }

    throw new Error('No se encontro el archivo push-sw.js en el frontend');
  }

  private async createPushSubscription(publicKey: string): Promise<PushSubscription> {
    const scripts = await this.getAvailablePushWorkerScripts();
    let lastError: unknown;
    const applicationServerKey = this.urlBase64ToUint8Array(publicKey);

    console.log('VAPID longitud convertida:', applicationServerKey.byteLength);

    for (const scriptUrl of scripts) {
      try {
        const registration = await this.registerPushWorker(scriptUrl);
        console.log('Service worker registrado:', {
          scriptUrl,
          scope: registration.scope,
          active: registration.active?.state,
          installing: registration.installing?.state,
          waiting: registration.waiting?.state,
        });

        const currentSubscription = await registration.pushManager.getSubscription();

        if (currentSubscription) {
          console.log('Suscripcion push existente:', currentSubscription.toJSON());
          return currentSubscription;
        }

        return await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } catch (error) {
        console.warn(`No se pudo activar push con ${scriptUrl}`);
        this.logPushError(error);
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('No se pudo crear la suscripcion push');
  }

  private async getAvailablePushWorkerScripts(): Promise<string[]> {
    const candidates = ['/push-sw.js', '/assets/push-sw.js'];
    const available: string[] = [];

    for (const scriptUrl of candidates) {
      try {
        const response = await fetch(scriptUrl, { cache: 'no-store' });

        if (response.ok) {
          available.push(scriptUrl);
        }
      } catch (error) {
        console.warn(`No se pudo verificar ${scriptUrl}:`, error);
      }
    }

    if (!available.length) {
      throw new Error('No se encontro el archivo push-sw.js en el frontend');
    }

    return available;
  }

  private async registerPushWorker(scriptUrl: string): Promise<ServiceWorkerRegistration> {
    const registration = await navigator.serviceWorker.register(scriptUrl);

    if (!registration.active && registration.installing) {
      await this.waitForServiceWorker(registration.installing);
    }

    return registration;
  }

  private async waitForServiceWorker(worker: ServiceWorker): Promise<void> {
    if (worker.state === 'activated') {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('El service worker no se activo a tiempo')), 8000);

      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') {
          window.clearTimeout(timeout);
          resolve();
        }
      });
    });
  }

  private getList<T>(response: T[] | { results?: T[] }): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.results || [];
  }

  private toIsoDate(value: string): string {
    if (!value) {
      return value;
    }

    return new Date(value).toISOString();
  }

  private getBackendError(error: unknown, fallback: string): string {
    if (typeof error !== 'object' || error === null || !('error' in error)) {
      return fallback;
    }

    const body = (error as { error?: unknown }).error;

    if (typeof body === 'string') {
      return body;
    }

    if (typeof body === 'object' && body !== null) {
      const detail = (body as Record<string, unknown>)['detail'];
      if (typeof detail === 'string') {
        return detail;
      }

      const firstError = Object.entries(body as Record<string, unknown>)
        .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
        .join(' | ');

      return firstError || fallback;
    }

    return fallback;
  }

  private logPushError(error: unknown): void {
    console.error('Error al activar push:', error);

    if (error instanceof DOMException) {
      console.error('DOMException.name:', error.name);
      console.error('DOMException.message:', error.message);
      console.error('DOMException.code:', error.code);
    }
  }

  private urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray.buffer.slice(outputArray.byteOffset, outputArray.byteOffset + outputArray.byteLength);
  }
}
