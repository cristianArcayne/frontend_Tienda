import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Servicio centralizado para configuración de URLs
 * Soporta multitenant automático detectando subdominios y entornos (localhost, LAN, Vercel/Render)
 */
@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = this.buildApiBaseUrl();
  }

  /**
   * Construir URL base dinámicamente según el contexto
   */
  private buildApiBaseUrl(): string {
    const hostname = window.location.hostname;
    // Si está desplegado en Vercel, forzar conexión HTTPS a Render
    if (hostname.endsWith('vercel.app')) {
      return 'https://tienda-backend-kvfk.onrender.com/api';
    }

    // Si estamos corriendo en entorno local (localhost o 127.0.0.1), conectar siempre a backend local port 8000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api';
    }

    if (!environment.isMultitenant) {
      return environment.apiBaseUrl;
    }

    const protocol = window.location.protocol;
    let port = window.location.port;

    // Si está en localhost, usar la URL del backend configurada
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return environment.apiBaseUrl;
    }

    // Multitenant local o producción
    // En desarrollo con subdominios: tienda-amiga.localhost:4200
    // → cambiar puerto 4200 a 8000 (backend)
    if (port === '4200') {
      port = '8000';
    }

    const portString = port ? `:${port}` : '';
    return `${protocol}//${hostname}${portString}/api`;
  }

  /**
   * Obtener la URL base de la API
   */
  getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }

  /**
   * Obtener URL completa para un endpoint
   * @param endpoint - Nombre del endpoint (ej: 'roles', 'usuarios', 'permisos')
   */
  getApiUrl(endpoint: string): string {
    return `${this.apiBaseUrl}/${endpoint}/`;
  }

  /**
   * Obtener el subdominio/tenant actual
   */
  getCurrentTenant(): string | null {
    if (typeof window === 'undefined') return null;
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return null;
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || hostname.endsWith('ngrok-free.dev') || hostname.endsWith('ngrok.io')) {
      return 'tienda-amiga';
    }

    const parts = hostname.split('.');
    return parts[0];
  }

  /**
   * Cambiar URL base dinámicamente (si es necesario)
   */
  setApiBaseUrl(url: string): void {
    this.apiBaseUrl = url;
  }

  /**
   * Formatea URLs de imágenes o recursos multimedia para que apunten al servidor backend correcto
   */
  formatImageUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return '/assets/images/products/product-1.png';
    }

    let cleanUrl = url.trim();

    // Determinar serverBase dinámicamente según el entorno actual
    let serverBase = 'http://localhost:8000';
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.endsWith('vercel.app')) {
        serverBase = 'https://tienda-backend-kvfk.onrender.com';
      } else if (hostname === '127.0.0.1') {
        serverBase = 'http://127.0.0.1:8000';
      } else {
        serverBase = `http://${hostname}:8000`;
      }
    }

    // Si viene con onrender y estamos en entorno local, redirigir a backend local
    if (cleanUrl.includes('onrender.com')) {
      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (isLocal) {
        cleanUrl = cleanUrl.replace(/^https?:\/\/[^\/]+/, serverBase);
      }
    }

    // Si viene con localhost o 127.0.0.1 pero estamos en Vercel
    if (cleanUrl.includes('localhost:8000') || cleanUrl.includes('127.0.0.1:8000')) {
      const isRemote = typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');
      if (isRemote) {
        cleanUrl = cleanUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/, serverBase);
      } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        cleanUrl = cleanUrl.replace('127.0.0.1:8000', 'localhost:8000');
      } else if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
        cleanUrl = cleanUrl.replace('localhost:8000', '127.0.0.1:8000');
      }
    }

    // Rutas relativas del backend (/static/...)
    if (cleanUrl.startsWith('/static/')) {
      return `${serverBase}${cleanUrl}`;
    }

    if (cleanUrl.startsWith('static/')) {
      return `${serverBase}/${cleanUrl}`;
    }

    if (cleanUrl.startsWith('/uploads/')) {
      return `${serverBase}/static${cleanUrl}`;
    }

    if (cleanUrl.startsWith('uploads/')) {
      return `${serverBase}/static/${cleanUrl}`;
    }

    // Si es un asset local de frontend aseguramos slash inicial
    if (cleanUrl.startsWith('assets/')) {
      return `/${cleanUrl}`;
    }

    if (cleanUrl.startsWith('/assets/')) {
      return cleanUrl;
    }

    if (cleanUrl.startsWith('/') && !cleanUrl.startsWith('http')) {
      return `${serverBase}${cleanUrl}`;
    }

    return cleanUrl;
  }
}
