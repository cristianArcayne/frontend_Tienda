import { Component, Inject, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Multimedia } from '../../../../../models/inventario/producto.model';

interface LightboxData {
  images: Multimedia[];
  startIndex: number;
  title?: string;
  modelUrl?: string;
  posterUrl?: string;
}

@Component({
  selector: 'app-imagen-lightbox',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './imagen-lightbox.component.html',
  styleUrl: './imagen-lightbox.component.scss'
})
export class ImagenLightboxComponent {
  index = 0;
  modelError: string | null = null;
  modelProgress = 0;
  isModelLoading = false;
  captureError: string | null = null;

  @ViewChild('modelViewer') modelViewer?: ElementRef<HTMLElement>;

  constructor(
    public dialogRef: MatDialogRef<ImagenLightboxComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LightboxData
  ) {
    const total = data.images?.length ?? 0;
    const safeIndex = total > 0 ? Math.max(0, Math.min(data.startIndex ?? 0, total - 1)) : 0;
    this.index = safeIndex;
  }

  get total(): number {
    return this.data.images?.length ?? 0;
  }

  get isModelView(): boolean {
    return !!this.data.modelUrl;
  }

  get imagenActualUrl(): string | null {
    return this.data.images?.[this.index]?.archivo_url || null;
  }

  siguiente(): void {
    if (this.total === 0) return;
    this.index = (this.index + 1) % this.total;
  }

  anterior(): void {
    if (this.total === 0) return;
    this.index = (this.index - 1 + this.total) % this.total;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  onModelLoad(): void {
    this.modelError = null;
    this.isModelLoading = false;
    this.modelProgress = 100;
    console.log('Model-viewer loaded:', this.data.modelUrl);
  }

  onModelError(event: Event): void {
    const detail = (event as CustomEvent)?.detail;
    this.modelError = detail?.message || 'Error al cargar el modelo 3D';
    this.isModelLoading = false;
    console.error('Model-viewer error:', detail || event);
  }

  onModelProgress(event: Event): void {
    const detail = (event as CustomEvent)?.detail;
    const progress = typeof detail?.totalProgress === 'number'
      ? Math.round(detail.totalProgress * 100)
      : 0;
    this.modelProgress = progress;
    this.isModelLoading = progress < 100;
  }

  capturarModelo3d(): void {
    if (!this.isModelView) return;
    this.captureError = null;

    try {
      const element = this.modelViewer?.nativeElement as any;
      let dataUrl: string | null = null;

      if (element && typeof element.toDataURL === 'function') {
        dataUrl = element.toDataURL();
      } else {
        const canvas = element?.shadowRoot?.querySelector('canvas') as HTMLCanvasElement | null;
        dataUrl = canvas?.toDataURL('image/png') || null;
      }

      if (!dataUrl) {
        throw new Error('No se pudo generar la imagen del modelo');
      }

      const link = document.createElement('a');
      const baseName = (this.data.title || 'modelo-3d')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = dataUrl;
      link.download = `${baseName || 'modelo-3d'}-${timestamp}.png`;
      link.click();
    } catch (error) {
      console.error('Error al capturar el modelo 3D:', error);
      this.captureError = 'No se pudo guardar la captura. Intenta de nuevo.';
    }
  }
}
