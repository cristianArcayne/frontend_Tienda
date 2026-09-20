import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export interface SeleccionarVarianteData {
  producto: any;
  sucursalId: number | null;
  sucursalNombre: string;
}

@Component({
  selector: 'app-seleccionar-variante-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <div class="p-20" style="max-width: 520px;">
      <div class="d-flex justify-content-between align-items-start m-b-16">
        <div>
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #1e293b;">
            {{ data.producto.nombre }}
          </h2>
          <span style="font-size: 13px; color: #64748b;">
            {{ data.producto.categoria_nombre }} &bull; {{ data.sucursalNombre }}
          </span>
        </div>
        <button mat-icon-button (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="d-flex gap-16 m-b-20" style="align-items: center;">
        <img [src]="getImagenUrl(data.producto.imagen_principal)"
             [alt]="data.producto.nombre"
             style="width: 90px; height: 90px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;"
             (error)="onImgError($event)">

        <div>
          <div *ngIf="data.producto.en_oferta" class="d-flex align-items-center gap-8 m-b-4">
            <span style="background: #fee2e2; color: #dc2626; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px;">
              -{{ data.producto.porcentaje_descuento }}% OFF
            </span>
            <span style="text-decoration: line-through; color: #94a3b8; font-size: 13px;">
              BOB {{ data.producto.precio_base | number:'1.2-2' }}
            </span>
          </div>

          <div style="font-size: 22px; font-weight: 800; color: #1e3a8a;">
            BOB {{ (varianteSeleccionada?.precio || data.producto.precio_promocional || data.producto.precio_minimo || data.producto.precio_base) | number:'1.2-2' }}
          </div>

          <div class="m-t-4">
            <span *ngIf="stockDisponible > 0" style="color: #16a34a; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
              <mat-icon style="font-size: 16px; width: 16px; height: 16px;">check_circle</mat-icon>
              {{ stockDisponible }} unidades disponibles
            </span>
            <span *ngIf="stockDisponible <= 0" style="color: #dc2626; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
              <mat-icon style="font-size: 16px; width: 16px; height: 16px;">cancel</mat-icon>
              Agotado en {{ data.sucursalNombre }}
            </span>
          </div>
        </div>
      </div>

      <!-- Selector de Talla -->
      <div *ngIf="tallasDisponibles.length > 0" class="m-b-16">
        <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px;">
          Seleccione Talla:
        </label>
        <mat-chip-listbox [(ngModel)]="tallaSeleccionada" (change)="onSeleccionChange()">
          <mat-chip-option *ngFor="let t of tallasDisponibles" [value]="t" color="primary">
            {{ t }}
          </mat-chip-option>
        </mat-chip-listbox>
      </div>

      <!-- Selector de Color -->
      <div *ngIf="coloresDisponibles.length > 0" class="m-b-16">
        <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px;">
          Seleccione Color:
        </label>
        <div class="d-flex flex-wrap gap-8">
          <button *ngFor="let c of coloresDisponibles"
                  type="button"
                  (click)="seleccionarColor(c.nombre)"
                  [style.border-color]="colorSeleccionado === c.nombre ? '#1e3a8a' : '#cbd5e1'"
                  [style.background]="colorSeleccionado === c.nombre ? '#f1f5f9' : 'white'"
                  style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border: 2px solid; border-radius: 6px; cursor: pointer;">
            <span [style.background]="c.hex || '#000'" style="width: 16px; height: 16px; border-radius: 50%; border: 1px solid #ccc; display: inline-block;"></span>
            <span style="font-size: 13px; font-weight: 500;">{{ c.nombre }}</span>
          </button>
        </div>
      </div>

      <!-- Selector de Cantidad -->
      <div class="d-flex align-items-center justify-content-between m-b-20 p-12" style="background: #f8fafc; border-radius: 8px;">
        <span style="font-size: 14px; font-weight: 600; color: #334155;">Cantidad a ordenar:</span>
        <div class="d-flex align-items-center gap-8">
          <button mat-icon-button (click)="decrementar()" [disabled]="cantidad <= 1">
            <mat-icon>remove</mat-icon>
          </button>
          <span style="font-size: 16px; font-weight: 700; min-width: 24px; text-align: center;">{{ cantidad }}</span>
          <button mat-icon-button (click)="incrementar()" [disabled]="cantidad >= stockDisponible">
            <mat-icon>add</mat-icon>
          </button>
        </div>
      </div>

      <!-- Botón Agregar -->
      <div class="d-flex justify-content-end gap-12">
        <button mat-button (click)="dialogRef.close()">
          Cancelar
        </button>
        <button mat-raised-button
                color="primary"
                [disabled]="!varianteSeleccionada || stockDisponible <= 0"
                (click)="confirmarAgregar()"
                style="padding: 0 24px; height: 44px; font-weight: 600;">
          <mat-icon class="m-r-6">shopping_cart</mat-icon>
          Agregar al Carrito
        </button>
      </div>
    </div>
  `
})
export class SeleccionarVarianteDialogComponent implements OnInit {
  tallasDisponibles: string[] = [];
  coloresDisponibles: { nombre: string; hex: string }[] = [];

  tallaSeleccionada: string = '';
  colorSeleccionado: string = '';
  varianteSeleccionada: any = null;
  cantidad: number = 1;

  constructor(
    public dialogRef: MatDialogRef<SeleccionarVarianteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SeleccionarVarianteData
  ) {}

  ngOnInit(): void {
    const variantes = this.data.producto.variantes || [];
    const tallasSet = new Set<string>();
    const coloresMap = new Map<string, string>();

    for (const v of variantes) {
      if (v.talla_nombre) tallasSet.add(v.talla_nombre);
      if (v.color_nombre) coloresMap.set(v.color_nombre, v.color_hex || '#000');
    }

    this.tallasDisponibles = Array.from(tallasSet);
    this.coloresDisponibles = Array.from(coloresMap.entries()).map(([nombre, hex]) => ({ nombre, hex }));

    if (this.tallasDisponibles.length > 0) {
      this.tallaSeleccionada = this.tallasDisponibles[0];
    }
    if (this.coloresDisponibles.length > 0) {
      this.colorSeleccionado = this.coloresDisponibles[0].nombre;
    }

    this.actualizarVariante();
  }

  seleccionarColor(nombre: string): void {
    this.colorSeleccionado = nombre;
    this.actualizarVariante();
  }

  onSeleccionChange(): void {
    this.actualizarVariante();
  }

  actualizarVariante(): void {
    const variantes = this.data.producto.variantes || [];
    let match = variantes.find((v: any) =>
      (!this.tallaSeleccionada || v.talla_nombre === this.tallaSeleccionada) &&
      (!this.colorSeleccionado || v.color_nombre === this.colorSeleccionado)
    );

    if (!match && variantes.length > 0) {
      match = variantes[0];
    }

    this.varianteSeleccionada = match || null;
    this.cantidad = 1;
  }

  get stockDisponible(): number {
    if (!this.varianteSeleccionada) return 0;
    return this.varianteSeleccionada.stock ?? this.varianteSeleccionada.cantidad ?? 0;
  }

  incrementar(): void {
    if (this.cantidad < this.stockDisponible) {
      this.cantidad++;
    }
  }

  decrementar(): void {
    if (this.cantidad > 1) {
      this.cantidad--;
    }
  }

  confirmarAgregar(): void {
    if (!this.varianteSeleccionada) return;
    this.dialogRef.close({
      varianteId: this.varianteSeleccionada.id,
      cantidad: this.cantidad,
      variante: this.varianteSeleccionada
    });
  }

  getImagenUrl(url: string | null): string {
    if (!url) return 'assets/images/products/product-1.png';
    if (url.startsWith('/static')) {
      return `http://localhost:8000${url}`;
    }
    return url;
  }

  onImgError(event: any): void {
    event.target.src = 'assets/images/products/product-1.png';
  }
}
