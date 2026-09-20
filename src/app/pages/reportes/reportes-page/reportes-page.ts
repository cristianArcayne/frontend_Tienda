import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { QbeBuilderComponent } from '../qbe-builder/qbe-builder';
import { TextoNLPComponent } from '../texto-nlp/texto-nlp';
import { VozComponent } from '../voz/voz';
import { ReporteResultadosComponent } from '../reporte-resultados/reporte-resultados';
import { ReporteExportComponent } from '../reporte-export/reporte-export';
import { ReportesService } from '../../../services/reportes.service';
import { ReporteRespuesta, NLPRespuesta } from '../../../models/reportes/reporte-respuesta.model';

@Component({
  selector: 'app-reportes-page',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    QbeBuilderComponent,
    TextoNLPComponent,
    VozComponent,
    ReporteResultadosComponent,
    ReporteExportComponent,
  ],
  templateUrl: './reportes-page.html',
  styleUrl: './reportes-page.scss'
})
export class ReportesPageComponent implements OnInit, OnDestroy {
  tabIndex = 0;
  isLoading = false;
  resultados: ReporteRespuesta | null = null;
  queryInterpretada: Record<string, any> | null = null;
  errorMsg: string | null = null;
  nombreReporte = 'reporte-ventas';
  presetActivo = 'ventas';

  presets = [
    { id: 'ventas', label: 'Ventas y Facturación', icon: 'solar:bill-check-line-duotone', query: 'ventas generales de la tienda' },
    { id: 'ranking', label: 'Prendas Más Vendidas', icon: 'solar:fire-line-duotone', query: 'prendas mas vendidas ranking' },
    { id: 'stock_critico', label: 'Stock Crítico / Bajo', icon: 'solar:danger-triangle-line-duotone', query: 'productos con stock minimo o bajo' },
    { id: 'clientes', label: 'Mejores Clientes', icon: 'solar:users-group-rounded-line-duotone', query: 'clientes que mas compraron' },
    { id: 'sucursales', label: 'Ventas por Sucursal', icon: 'solar:shop-2-line-duotone', query: 'ventas por sucursal' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private reportesService: ReportesService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Cargar automáticamente un reporte inicial de ventas para que no esté vacío
    this.cargarReporteInicial();
  }

  cargarReporteInicial(): void {
    this.isLoading = true;
    this.errorMsg = null;
    this.presetActivo = 'ventas';
    this.nombreReporte = 'reporte-ventas';

    this.reportesService.ejecutarQBE({
      vista_logica: 'ventas',
      paginacion: { pagina: 1, cantidad_por_pagina: 100 }
    })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({
      next: (res) => {
        this.resultados = res;
        this.queryInterpretada = {
          intencion: 'Resumen consolidado de ventas y facturación comercial',
          periodo: 'Histórico'
        };
      },
      error: (err) => {
        console.warn('Aviso al cargar reporte inicial:', err);
        // Fallback rápido con NLP
        this.ejecutarPreset(this.presets[0]);
      }
    });
  }

  ejecutarPreset(preset: { id: string; label: string; icon: string; query: string }): void {
    this.presetActivo = preset.id;
    this.isLoading = true;
    this.errorMsg = null;
    this.nombreReporte = `reporte-${preset.id}`;

    this.reportesService.ejecutarNLP({ texto: preset.query })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (res: NLPRespuesta) => {
          this.resultados = res.resultados;
          this.queryInterpretada = res.query_interpretada;
          const total = res.resultados?.paginacion?.total_registros || res.resultados?.datos?.length || 0;
          this.snackBar.open(`${preset.label}: ${total} registros generados`, 'OK', { duration: 3000 });
        },
        error: (err) => {
          this.errorMsg = err.error?.error || err.error?.message || 'Error al generar el reporte';
          this.snackBar.open(this.errorMsg || '', 'Cerrar', { duration: 4000 });
        }
      });
  }

  onTabChange(event: any): void {
    this.tabIndex = event.index;
  }

  onEjecutarQBE(payload: { resultados: ReporteRespuesta; nombre: string }): void {
    this.resultados = payload.resultados;
    this.queryInterpretada = {
      intencion: `Consulta QBE personalizada: ${payload.nombre}`,
    };
    this.errorMsg = null;
    this.nombreReporte = payload.nombre;
    this.presetActivo = '';
  }

  onEjecutarNLP(respuesta: NLPRespuesta): void {
    this.resultados = respuesta.resultados;
    this.queryInterpretada = respuesta.query_interpretada;
    this.errorMsg = null;
    this.nombreReporte = 'reporte-ia-nlp';
    this.presetActivo = '';
  }

  limpiarResultados(): void {
    this.resultados = null;
    this.queryInterpretada = null;
    this.errorMsg = null;
    this.presetActivo = '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
