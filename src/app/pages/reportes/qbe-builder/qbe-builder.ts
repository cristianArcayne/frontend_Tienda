import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReportesService } from '../../../services/reportes.service';
import { VistaLogica, CampoVista } from '../../../models/reportes/vista-logica.model';
import { QbePayload } from '../../../models/reportes/reporte-qbe.model';
import { ReporteRespuesta } from '../../../models/reportes/reporte-respuesta.model';

@Component({
  selector: 'app-qbe-builder',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './qbe-builder.html',
  styleUrl: './qbe-builder.scss'
})
export class QbeBuilderComponent implements OnInit {
  @Input() isLoading = false;
  @Output() ejecutarQBE = new EventEmitter<{ resultados: ReporteRespuesta; nombre: string }>();

  vistas: VistaLogica[] = [];
  vistaSeleccionada: VistaLogica | null = null;
  camposDisponibles: CampoVista[] = [];
  camposAgrupables: CampoVista[] = [];
  camposAgregables: CampoVista[] = [];

  meses = [
    { valor: 0, label: 'Todos los meses' },
    { valor: 1, label: 'Enero' }, { valor: 2, label: 'Febrero' }, { valor: 3, label: 'Marzo' },
    { valor: 4, label: 'Abril' }, { valor: 5, label: 'Mayo' }, { valor: 6, label: 'Junio' },
    { valor: 7, label: 'Julio' }, { valor: 8, label: 'Agosto' }, { valor: 9, label: 'Septiembre' },
    { valor: 10, label: 'Octubre' }, { valor: 11, label: 'Noviembre' }, { valor: 12, label: 'Diciembre' },
  ];
  groupByOptions = [
    { valor: 'categoria', label: 'Categoría' },
    { valor: 'marca', label: 'Marca' },
    { valor: 'producto', label: 'Producto' },
    { valor: 'variante', label: 'Variante' },
  ];
  gananciasMes = new Date().getMonth() + 1;
  gananciasGroupBy = 'categoria';
  gananciasCargando = false;

  form: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private reportesService: ReportesService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      vista_logica: ['', Validators.required],
      filtros: this.fb.array([]),
      agrupar_por: [[]],
      metricas: this.fb.array([]),
      filtros_having: this.fb.array([]),
      ordenar_por: [''],
      pagina: [1],
      cantidad_por_pagina: [50],
    });
  }

  ngOnInit(): void {
    this.reportesService.getVistas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.vistas = res.vistas;
          if (this.vistas.length) {
            this.form.patchValue({ vista_logica: this.vistas[0].nombre });
            this.onVistaChange();
          }
        },
        error: () => this.snackBar.open('Error al cargar vistas', 'Cerrar', { duration: 5000 })
      });
  }

  get filtros(): FormArray { return this.form.get('filtros') as FormArray; }
  get metricas(): FormArray { return this.form.get('metricas') as FormArray; }
  get filtrosHaving(): FormArray { return this.form.get('filtros_having') as FormArray; }

  private esCampoTecnico(nombre: string): boolean {
    return nombre === 'id' || nombre.endsWith('_id');
  }

  traducirOperador(op: string): string {
    const map: Record<string, string> = {
      exact: 'es exactamente',
      neq: 'no es igual a',
      gte: 'mayor o igual que',
      lte: 'menor o igual que',
      gt: 'mayor que',
      lt: 'menor que',
      contains: 'contiene',
      icontains: 'contiene (sin mayúsculas)',
      startswith: 'comienza con',
      month: 'es del mes',
      year: 'es del año',
      day: 'es del día',
    };
    return map[op] || op;
  }

  onVistaChange(): void {
    const nombre = this.form.get('vista_logica')?.value;
    this.vistaSeleccionada = this.vistas.find(v => v.nombre === nombre) || null;
    if (this.vistaSeleccionada) {
      const todos = this.vistaSeleccionada.campos;
      this.camposDisponibles = todos.filter(c => !this.esCampoTecnico(c.nombre));
      this.camposAgrupables = todos.filter(c => c.agrupable && !this.esCampoTecnico(c.nombre));
      this.camposAgregables = todos.filter(c => c.agregable && !this.esCampoTecnico(c.nombre));
    }
  }

  getOperadoresParaFiltro(f: any): string[] {
    const campoNombre = f.get('campo')?.value;
    if (!campoNombre || !this.vistaSeleccionada) return ['exact'];
    const campo = this.vistaSeleccionada.campos.find(c => c.nombre === campoNombre);
    return campo ? campo.operadores : ['exact'];
  }

  agregarFiltro(): void {
    this.filtros.push(this.fb.group({
      campo: ['', Validators.required],
      operador: ['exact'],
      valor: [''],
    }));
  }

  removerFiltro(i: number): void {
    this.filtros.removeAt(i);
  }

  agregarMetrica(): void {
    this.metricas.push(this.fb.group({
      campo: ['', Validators.required],
      operacion: ['sum'],
      alias: [''],
    }));
  }

  removerMetrica(i: number): void {
    this.metricas.removeAt(i);
  }

  agregarHaving(): void {
    this.filtrosHaving.push(this.fb.group({
      alias: ['', Validators.required],
      operador: ['gte'],
      valor: [''],
    }));
  }

  removerHaving(i: number): void {
    this.filtrosHaving.removeAt(i);
  }

  enviarQBE(): void {
    if (!this.form.get('vista_logica')?.value) {
      this.snackBar.open('Selecciona una vista lógica', 'Cerrar', { duration: 3000 });
      return;
    }

    const raw = this.form.value;
    const payload: QbePayload = {
      vista_logica: raw.vista_logica,
      paginacion: { pagina: raw.pagina || 1, cantidad_por_pagina: raw.cantidad_por_pagina || 50 },
    };

    if (raw.filtros?.length) {
      payload.filtros = raw.filtros.map((f: any) => ({
        campo: f.campo,
        operador: f.operador || 'exact',
        valor: isNaN(Number(f.valor)) ? f.valor : Number(f.valor),
      }));
    }

    if (raw.agrupar_por?.length) {
      payload.agrupar_por = raw.agrupar_por;
    }

    if (raw.metricas?.length) {
      payload.metricas_agrupadas = raw.metricas.map((m: any) => ({
        campo: m.campo,
        operacion: m.operacion,
        alias: m.alias || `${m.campo}_${m.operacion}`,
      }));
    }

    if (raw.filtros_having?.length) {
      payload.filtros_having = raw.filtros_having.map((h: any) => ({
        alias: h.alias,
        operador: h.operador,
        valor: isNaN(Number(h.valor)) ? h.valor : Number(h.valor),
      }));
    }

    if (raw.ordenar_por) {
      payload.ordenar_por = raw.ordenar_por;
    }

    this.reportesService.ejecutarQBE(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.ejecutarQBE.emit({ resultados: res, nombre: `qbe-${raw.vista_logica}` });
          this.snackBar.open(`Reporte ejecutado: ${res.paginacion.total_registros} registros`, 'OK', { duration: 3000 });
        },
        error: (err) => {
          const msg = err.error?.error || err.error?.message || 'Error al ejecutar reporte';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      });
  }

  generarGanancias(): void {
    const groupByMap: Record<string, string[]> = {
      categoria: ['categoria_id', 'categoria_nombre'],
      marca: ['marca_id', 'marca_nombre'],
      producto: ['producto_id', 'producto_nombre'],
      variante: ['variante_id', 'variante_sku', 'producto_nombre'],
    };

    const payload: QbePayload = {
      vista_logica: 'detalle_venta',
      ...(this.gananciasMes ? { filtros: [{ campo: 'venta_fecha', operador: 'month', valor: this.gananciasMes }] } : {}),
      agrupar_por: groupByMap[this.gananciasGroupBy] || groupByMap['categoria'],
      metricas_agrupadas: [
        { campo: 'ganancia', operacion: 'sum', alias: 'ganancia_total' },
      ],
      ordenar_por: '-ganancia_total',
    };

    this.gananciasCargando = true;
    this.reportesService.ejecutarQBE(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.gananciasCargando = false;
          this.ejecutarQBE.emit({ resultados: res, nombre: `ganancias-${this.gananciasGroupBy}` });
          this.snackBar.open(`Ganancias: ${res.paginacion.total_registros} registros`, 'OK', { duration: 3000 });
        },
        error: (err) => {
          this.gananciasCargando = false;
          const msg = err.error?.error || err.error?.message || 'Error al generar ganancias';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
