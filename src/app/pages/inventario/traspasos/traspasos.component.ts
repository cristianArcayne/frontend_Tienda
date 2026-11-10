import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';

import {
  TraspasosService,
  TraspasoItem,
  TraspasoMetricas,
  VarianteDisponible
} from '../../../services/traspasos.service';

@Component({
  selector: 'app-traspasos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './traspasos.component.html',
  styleUrls: ['./traspasos.component.scss']
})
export class TraspasosComponent implements OnInit, OnDestroy {
  columnasTabla: string[] = ['guia', 'origen', 'destino', 'prendas', 'unidades', 'estado', 'acciones'];

  traspasos: TraspasoItem[] = [];
  traspasosFiltrados: TraspasoItem[] = [];
  metricas: TraspasoMetricas | null = null;
  sucursales: any[] = [];
  variantesDisponibles: VarianteDisponible[] = [];

  activeTab: 'TABLERO' | 'NUEVO_TRASPASO' | 'SCANNER_QR' = 'TABLERO';
  filtroEstado: string = 'TODOS';
  terminoBusqueda: string = '';

  isLoading = false;
  cargandoVariantes = false;
  guardandoTraspaso = false;

  // Formulario de Nuevo Traspaso Multi-Prenda
  nuevoTraspaso = {
    sucursal_origen_id: 1,
    sucursal_destino_id: 2,
    observacion: 'Rebalanceo de inventario inter-tiendas',
    solicitado_por_ci: '1001',
    despachar_inmediato: false
  };

  varianteSeleccionadaId: number = 0;
  cantidadParaAgregar: number = 1;
  varianteActualStockMax: number = 1;
  itemsOrden: any[] = [];

  // Modales
  guiaSeleccionadaModal: TraspasoItem | null = null;
  traspasoDiscrepanciaModal: TraspasoItem | null = null;
  discrepanciaForm: { observacion: string; items: any[] } = { observacion: '', items: [] };

  // Búsqueda rápida QR
  inputGuiaCodigo: string = '';
  guiaConsultada: TraspasoItem | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private traspasosService: TraspasosService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  activarTab(tab: 'TABLERO' | 'NUEVO_TRASPASO' | 'SCANNER_QR'): void {
    this.activeTab = tab;
    if (tab === 'NUEVO_TRASPASO') {
      this.onOrigenChange();
    }
  }

  cargarDatos(): void {
    this.cargarMetricas();
    this.cargarTraspasos();
  }

  cargarSucursales(): void {
    this.traspasosService.getSucursales()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.sucursales = data || [];
          if (this.sucursales.length >= 2) {
            this.nuevoTraspaso.sucursal_origen_id = this.sucursales[0].id;
            this.nuevoTraspaso.sucursal_destino_id = this.sucursales[1].id;
          }
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Error cargando sucursales:', err)
      });
  }

  cargarMetricas(): void {
    this.traspasosService.getMetricas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (m) => {
          this.metricas = m;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Error cargando métricas:', err)
      });
  }

  cargarTraspasos(): void {
    this.isLoading = true;
    this.traspasosService.getTraspasos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.traspasos = data || [];
          this.filtrarTraspasos();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error al cargar traspasos:', err);
          this.snackBar.open('Error al sincronizar traspasos desde el servidor', 'Cerrar', { duration: 4000 });
          this.cdr.markForCheck();
        }
      });
  }

  filtrarPorEstado(estado: string): void {
    this.filtroEstado = estado;
    this.filtrarTraspasos();
  }

  filtrarTraspasos(): void {
    let result = [...this.traspasos];

    if (this.filtroEstado !== 'TODOS') {
      result = result.filter(t => t.estado === this.filtroEstado);
    }

    if (this.terminoBusqueda && this.terminoBusqueda.trim() !== '') {
      const q = this.terminoBusqueda.toLowerCase().trim();
      result = result.filter(t =>
        (t.guia_remision_codigo && t.guia_remision_codigo.toLowerCase().includes(q)) ||
        (t.sucursal_origen_nombre && t.sucursal_origen_nombre.toLowerCase().includes(q)) ||
        (t.sucursal_destino_nombre && t.sucursal_destino_nombre.toLowerCase().includes(q)) ||
        t.detalles.some(d => d.ropa_nombre.toLowerCase().includes(q) || d.sku.toLowerCase().includes(q))
      );
    }

    this.traspasosFiltrados = result;
    this.cdr.markForCheck();
  }

  getCountPorEstado(estado: string): number {
    return this.traspasos.filter(t => t.estado === estado).length;
  }

  onOrigenChange(): void {
    if (!this.nuevoTraspaso.sucursal_origen_id) return;
    this.cargandoVariantes = true;
    this.variantesDisponibles = [];
    this.itemsOrden = [];
    this.varianteSeleccionadaId = 0;

    this.traspasosService.getVariantesDisponibles(this.nuevoTraspaso.sucursal_origen_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.variantesDisponibles = items || [];
          this.cargandoVariantes = false;
          if (this.variantesDisponibles.length > 0) {
            this.varianteSeleccionadaId = this.variantesDisponibles[0].variante_id;
            this.onVarianteSelectChange();
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cargandoVariantes = false;
          console.error('Error cargando variantes:', err);
          this.cdr.markForCheck();
        }
      });
  }

  onVarianteSelectChange(): void {
    const v = this.variantesDisponibles.find(item => item.variante_id === this.varianteSeleccionadaId);
    if (v) {
      this.varianteActualStockMax = v.stock_disponible;
      this.cantidadParaAgregar = Math.min(1, v.stock_disponible);
    } else {
      this.varianteActualStockMax = 1;
      this.cantidadParaAgregar = 1;
    }
  }

  agregarItemALista(): void {
    const v = this.variantesDisponibles.find(item => item.variante_id === this.varianteSeleccionadaId);
    if (!v || this.cantidadParaAgregar <= 0) return;

    const existente = this.itemsOrden.find(i => i.variante_id === v.variante_id);
    if (existente) {
      if (existente.cantidad + this.cantidadParaAgregar > v.stock_disponible) {
        this.snackBar.open(`Stock insuficiente: disponible máximo ${v.stock_disponible} unidades.`, 'OK', { duration: 3000 });
        return;
      }
      existente.cantidad += this.cantidadParaAgregar;
    } else {
      this.itemsOrden.push({
        variante_id: v.variante_id,
        ropa_nombre: v.ropa_nombre,
        sku: v.sku,
        talla: v.talla,
        color: v.color,
        color_hex: v.color_hex,
        cantidad: this.cantidadParaAgregar
      });
    }

    this.snackBar.open(`Línea agregada: ${v.ropa_nombre} (${this.cantidadParaAgregar} uds.)`, 'OK', { duration: 2000 });
  }

  eliminarItemOrden(index: number): void {
    this.itemsOrden.splice(index, 1);
  }

  emitirOrdenTraspaso(): void {
    if (this.nuevoTraspaso.sucursal_origen_id === this.nuevoTraspaso.sucursal_destino_id) {
      this.snackBar.open('La sucursal de origen y destino no pueden ser iguales', 'Cerrar', { duration: 3500 });
      return;
    }

    if (this.itemsOrden.length === 0) {
      this.snackBar.open('Debe incluir al menos una prenda en el traspaso', 'Cerrar', { duration: 3000 });
      return;
    }

    this.guardandoTraspaso = true;
    const payload = {
      sucursal_origen_id: this.nuevoTraspaso.sucursal_origen_id,
      sucursal_destino_id: this.nuevoTraspaso.sucursal_destino_id,
      observacion: this.nuevoTraspaso.observacion,
      solicitado_por_ci: this.nuevoTraspaso.solicitado_por_ci || '1001',
      despachar_inmediato: this.nuevoTraspaso.despachar_inmediato,
      detalles: this.itemsOrden.map(item => ({
        variante_id: item.variante_id,
        cantidad: item.cantidad
      }))
    };

    this.traspasosService.crearTraspaso(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (creado) => {
          this.guardandoTraspaso = false;
          this.itemsOrden = [];
          this.snackBar.open(`Orden de Traspaso #${creado.id} (${creado.guia_remision_codigo}) emitida con éxito`, 'OK', { duration: 3500 });
          this.activarTab('TABLERO');
          this.cargarDatos();
        },
        error: (err) => {
          this.guardandoTraspaso = false;
          const msg = err?.error?.detail || 'Error al emitir orden de traspaso';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
          this.cdr.markForCheck();
        }
      });
  }

  despacharTraspaso(t: TraspasoItem): void {
    this.traspasosService.despacharTraspaso(t.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (despachado) => {
          this.snackBar.open(`Traspaso #${t.id} despachado. Nuevo estado: EN_TRANSITO`, 'OK', { duration: 3000 });
          this.cargarDatos();
        },
        error: (err) => {
          this.snackBar.open(err?.error?.detail || 'Error al despachar carga', 'Cerrar', { duration: 4000 });
        }
      });
  }

  confirmarRecepcionDirecta(t: TraspasoItem): void {
    this.traspasosService.confirmarRecepcion(t.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open(`Traspaso #${t.id} recepcionado conforme. Stock sumado en destino.`, 'OK', { duration: 3500 });
          this.cargarDatos();
          if (this.guiaConsultada && this.guiaConsultada.id === t.id) {
            this.guiaConsultada.estado = 'RECIBIDO';
          }
        },
        error: (err) => {
          this.snackBar.open(err?.error?.detail || 'Error al confirmar recepción', 'Cerrar', { duration: 4000 });
        }
      });
  }

  // Flujo Alternativo 6a: Discrepancia / Merma
  abrirModalDiscrepancia(t: TraspasoItem): void {
    this.traspasoDiscrepanciaModal = t;
    this.discrepanciaForm = {
      observacion: '',
      items: t.detalles.map(d => ({
        variante_id: d.variante_id,
        ropa_nombre: d.ropa_nombre,
        sku: d.sku,
        talla: d.talla,
        color: d.color,
        total_enviado: d.cantidad,
        cantidad_recibida_conforme: d.cantidad,
        cantidad_danada_o_merma: 0,
        motivo_merma: ''
      }))
    };
  }

  cerrarModalDiscrepancia(): void {
    this.traspasoDiscrepanciaModal = null;
  }

  procesarDiscrepancia(): void {
    if (!this.traspasoDiscrepanciaModal) return;

    const payload = {
      observacion: this.discrepanciaForm.observacion,
      recibido_por_ci: 'EMP-DESTINO-01',
      detalles: this.discrepanciaForm.items.map(item => ({
        variante_id: item.variante_id,
        cantidad_recibida_conforme: Number(item.cantidad_recibida_conforme || 0),
        cantidad_danada_o_merma: Number(item.cantidad_danada_o_merma || 0),
        motivo_merma: item.motivo_merma || 'Merma reportada en recepción'
      }))
    };

    this.traspasosService.confirmarRecepcionConDiscrepancia(this.traspasoDiscrepanciaModal.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Recepción con discrepancia auditada en Kardex exitosamente', 'OK', { duration: 4000 });
          this.cerrarModalDiscrepancia();
          this.cargarDatos();
        },
        error: (err) => {
          this.snackBar.open(err?.error?.detail || 'Error procesando discrepancia', 'Cerrar', { duration: 4000 });
        }
      });
  }

  verGuiaRemision(t: TraspasoItem): void {
    this.traspasosService.getGuiaRemision(t.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (guia) => {
          this.guiaSeleccionadaModal = guia;
          this.cdr.markForCheck();
        },
        error: () => {
          this.guiaSeleccionadaModal = t;
          this.cdr.markForCheck();
        }
      });
  }

  cerrarModalGuia(): void {
    this.guiaSeleccionadaModal = null;
  }

  imprimirGuia(): void {
    window.print();
  }

  cancelarTraspaso(t: TraspasoItem): void {
    if (!confirm(`¿Estás seguro de cancelar el Traspaso #${t.id}? Si estaba en tránsito, las existencias se restituirán a origen.`)) {
      return;
    }

    this.traspasosService.cancelarTraspaso(t.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open(`Traspaso #${t.id} cancelado y existencias restituidas a origen`, 'OK', { duration: 3500 });
          this.cargarDatos();
        },
        error: (err) => {
          this.snackBar.open(err?.error?.detail || 'Error cancelando traspaso', 'Cerrar', { duration: 4000 });
        }
      });
  }

  consultarGuiaPorCodigo(): void {
    if (!this.inputGuiaCodigo || this.inputGuiaCodigo.trim() === '') {
      this.snackBar.open('Ingrese un código de guía o ID válido', 'Cerrar', { duration: 3000 });
      return;
    }

    const term = this.inputGuiaCodigo.trim().toLowerCase();
    const encontrada = this.traspasos.find(t =>
      (t.guia_remision_codigo && t.guia_remision_codigo.toLowerCase().includes(term)) ||
      String(t.id) === term
    );

    if (encontrada) {
      this.guiaConsultada = encontrada;
      this.snackBar.open(`Guía ${encontrada.guia_remision_codigo} localizada`, 'OK', { duration: 2500 });
    } else {
      const numId = parseInt(term, 10);
      if (!isNaN(numId)) {
        this.traspasosService.getGuiaRemision(numId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (g) => {
              this.guiaConsultada = g;
              this.snackBar.open(`Guía localizada: ${g.guia_remision_codigo}`, 'OK', { duration: 2500 });
            },
            error: () => {
              this.guiaConsultada = null;
              this.snackBar.open('No se encontró ninguna guía con ese identificador', 'Cerrar', { duration: 3000 });
            }
          });
      } else {
        this.guiaConsultada = null;
        this.snackBar.open('No se encontró ninguna guía con ese identificador', 'Cerrar', { duration: 3000 });
      }
    }
  }
}
