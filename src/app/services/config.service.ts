import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Servicio centralizado para configuración de URLs
 * Soporta multitenant automático detectando subdominios
 *
 * Ejemplos:
 * - tienda-amiga.localhost:8000 → http://tienda-amiga.localhost:8000/api
 * - empresa-xyz.saas.com → https://empresa-xyz.saas.com/api
 * - localhost:4200 → http://localhost:8000/api (fallback)
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
   * Si es multitenant, detecta el subdominio del hostname actual
   */
  private buildApiBaseUrl(): string {
    if (!environment.isMultitenant) {
      return environment.apiBaseUrl;
    }

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    let port = window.location.port;

    // Si está en localhost o desplegado en Vercel, usar la URL del backend configurada
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('vercel.app')) {
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
   * Ej: tienda-amiga.localhost → 'tienda-amiga'
   */
  getCurrentTenant(): string | null {
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return null;  // No hay tenant en desarrollo local
    }

    // Fallback para IPs locales o túneles de ngrok en desarrollo
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || hostname.endsWith('ngrok-free.dev') || hostname.endsWith('ngrok.io')) {
      return 'tienda-amiga';
    }

    const parts = hostname.split('.');
    return parts[0];  // Devolver solo el subdominio
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
      return '';
    }

    let cleanUrl = url.trim();

    // Obtener la raíz del servidor backend eliminando el sufijo /api
    const serverBase = this.apiBaseUrl.replace(/\/api\/?$/, '');

    // Si viene con localhost:8000 o 127.0.0.1:8000 pero estamos en entorno remoto (Vercel)
    if (cleanUrl.includes('localhost:8000') || cleanUrl.includes('127.0.0.1:8000')) {
      const isRemote = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      if (isRemote) {
        cleanUrl = cleanUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/, serverBase);
      }
    }

    // Si es una ruta relativa (/static/...)
    if (cleanUrl.startsWith('/static/')) {
      return `${serverBase}${cleanUrl}`;
    }

    if (cleanUrl.startsWith('static/')) {
      return `${serverBase}/${cleanUrl}`;
    }

    return cleanUrl;
  }
}