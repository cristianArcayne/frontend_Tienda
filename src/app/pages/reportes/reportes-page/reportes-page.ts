import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexNonAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexLegend,
  ApexPlotOptions,
  ApexResponsive
} from 'ng-apexcharts';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { QbeBuilderComponent } from '../qbe-builder/qbe-builder';
import { TextoNLPComponent } from '../texto-nlp/texto-nlp';
import { VozComponent } from '../voz/voz';
import { ReporteExportComponent } from '../reporte-export/reporte-export';
import { ReportesService, ReporteIAResponse } from '../../../services/reportes.service';
import { ReporteRespuesta, NLPRespuesta } from '../../../models/reportes/reporte-respuesta.model';

export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  labels?: string[];
  colors?: string[];
  plotOptions?: ApexPlotOptions;
  dataLabels?: ApexDataLabels;
  tooltip?: ApexTooltip;
  legend?: ApexLegend;
  responsive?: ApexResponsive[];
};

@Component({
  selector: 'app-reportes-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    NgApexchartsModule,
    QbeBuilderComponent,
    TextoNLPComponent,
    VozComponent,
    ReporteExportComponent
  ],
  templateUrl: './reportes-page.html',
  styleUrl: './reportes-page.scss'
})
export class ReportesPageComponent implements OnInit, OnDestroy {
  tabIndex = 0;
  isLoading = false;
  isPlanBasicoError = false;
  errorMsg: string | null = null;
  nombreReporte = 'reporte-ia-ventas-sucursales';
  presetActivo = 'sucursales';

  // Respuesta de IA Generativa (CU-15)
  reporteIA: ReporteIAResponse | null = null;
  kpiEntries: Array<{ label: string; valor: any; icon: string }> = [];

  // Gráfico Interactivo ApexCharts
  hasChart = false;
  chartOptions: Partial<ChartOptions> | null = null;

  // Tabla Dinámica
  displayedColumnsKeys: string[] = [];
  columnasTabla: Array<{ key: string; label: string }> = [];
  datosFiltrados: any[] = [];
  filtroBusqueda = '';
  pageIndex = 0;
  pageSize = 10;

  // Fallback / Constructor QBE Tradicional
  resultadosQBE: ReporteRespuesta | null = null;

  // Síntesis de Voz (Text-to-Speech con IA)
  isSpeaking = false;
  speechUtterance: SpeechSynthesisUtterance | null = null;

  // Presets Rápidos de IA (Comandos Inteligentes)
  presets = [
    {
      id: 'sucursales',
      label: 'Ventas por Sucursal',
      icon: 'store',
      query: 'Mostrar reporte de ventas por sucursal con ingresos y transacciones'
    },
    {
      id: 'canales',
      label: 'Ventas por Canal (POS vs Digital)',
      icon: 'sync_alt',
      query: 'Comparar ventas por canal presencial pos versus digital'
    },
    {
      id: 'ranking',
      label: 'Prendas Más Vendidas',
      icon: 'local_fire_department',
      query: 'Cuáles son los productos más vendidos'
    },
    {
      id: 'stock_critico',
      label: 'Alertas de Stock Crítico',
      icon: 'warning_amber',
      query: 'Cuáles son las prendas con stock crítico y escasez'
    },
    {
      id: 'resumen',
      label: 'Resumen Ejecutivo General',
      icon: 'insights',
      query: 'Resumen ejecutivo general del negocio'
    },
    {
      id: 'clientes',
      label: 'Padrón de Clientes',
      icon: 'groups',
      query: 'Reporte de clientes fidelizados y compras'
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private reportesService: ReportesService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Al iniciar, cargar automáticamente el reporte analítico gerencial de ventas por sucursal
    this.ejecutarComandoIA('Mostrar reporte de ventas por sucursal', 'sucursales');
  }

  // Ejecución de Consulta Generativa con IA (CU-15)
  ejecutarComandoIA(comando: string, presetId?: string): void {
    if (!comando || !comando.trim()) return;

    this.detenerVoz();
    this.isLoading = true;
    this.isPlanBasicoError = false;
    this.errorMsg = null;
    this.resultadosQBE = null;
    if (presetId) this.presetActivo = presetId;
    this.nombreReporte = `reporte-ia-${presetId || 'consulta'}`;

    this.reportesService.ejecutarReporteIA(comando)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (resp) => {
          this.procesarRespuestaIA(resp);
          this.snackBar.open(
            `✨ Dictamen IA generado: ${resp.intencion_detectada.replace(/_/g, ' ')}`,
            'OK',
            { duration: 3500 }
          );
        },
        error: (err) => {
          if (err.status === 403) {
            this.isPlanBasicoError = true;
            this.errorMsg = err.error?.detail || 'Acceso Denegado: Su empresa cuenta con un plan que no incluye funciones de IA. Actualice a Plan Profesional.';
          } else {
            this.errorMsg = err.error?.detail || err.error?.error || 'Error al procesar el reporte con el motor de IA.';
            this.snackBar.open(this.errorMsg || '', 'Cerrar', { duration: 4500 });
          }
        }
      });
  }

  private procesarRespuestaIA(resp: ReporteIAResponse): void {
    this.reporteIA = resp;

    // Procesar Métricas KPI
    this.kpiEntries = [];
    if (resp.metricas_kpi) {
      for (const [key, val] of Object.entries(resp.metricas_kpi)) {
        let label = key.replace(/_/g, ' ').toUpperCase();
        let icon = 'analytics';

        if (key.includes('ingreso') || key.includes('monto') || key.includes('total')) icon = 'payments';
        else if (key.includes('sucursal')) icon = 'store';
        else if (key.includes('cliente')) icon = 'people';
        else if (key.includes('stock') || key.includes('critico')) icon = 'warning';
        else if (key.includes('canal')) icon = 'hub';

        this.kpiEntries.push({ label, valor: val, icon });
      }
    }

    // Configurar Gráfico Interactivo ApexCharts
    this.setupChart(resp.datos_grafico);

    // Configurar Tabla de Datos
    if (resp.datos_tabla && resp.datos_tabla.length > 0) {
      if (resp.columnas_tabla && resp.columnas_tabla.length > 0) {
        this.columnasTabla = resp.columnas_tabla;
      } else {
        this.columnasTabla = Object.keys(resp.datos_tabla[0]).map(k => ({
          key: k,
          label: k.replace(/_/g, ' ').toUpperCase()
        }));
      }
      this.displayedColumnsKeys = this.columnasTabla.map(c => c.key);
      this.datosFiltrados = [...resp.datos_tabla];
      this.pageIndex = 0;
      this.filtroBusqueda = '';
    } else {
      this.columnasTabla = [];
      this.displayedColumnsKeys = [];
      this.datosFiltrados = [];
    }
  }

  // Configuración dinámica del Gráfico ApexCharts
  private setupChart(datosGrafico: any): void {
    if (!datosGrafico || !datosGrafico.labels || datosGrafico.labels.length === 0) {
      this.hasChart = false;
      this.chartOptions = null;
      return;
    }

    this.hasChart = true;
    const tipo = (datosGrafico.tipo_grafico || 'bar').toLowerCase();

    if (tipo === 'donut' || tipo === 'pie') {
      const numericSeries = Array.isArray(datosGrafico.series)
        ? datosGrafico.series.map((v: any) => (typeof v === 'number' ? v : Number(v) || 0))
        : [];

      this.chartOptions = {
        series: numericSeries,
        chart: {
          type: tipo as any,
          height: 350,
          fontFamily: 'Plus Jakarta Sans, sans-serif'
        },
        labels: datosGrafico.labels,
        colors: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
        legend: {
          position: 'bottom',
          fontSize: '13px'
        },
        dataLabels: {
          enabled: true
        },
        responsive: [
          {
            breakpoint: 480,
            options: {
              chart: { width: 300 },
              legend: { position: 'bottom' }
            }
          }
        ]
      };
    } else {
      // Bar o Line Chart
      let seriesData: any[] = [];
      if (Array.isArray(datosGrafico.series) && typeof datosGrafico.series[0] === 'object' && datosGrafico.series[0]?.data) {
        seriesData = datosGrafico.series;
      } else if (Array.isArray(datosGrafico.series)) {
        seriesData = [
          {
            name: 'Monto / Unidades',
            data: datosGrafico.series.map((v: any) => (typeof v === 'number' ? v : Number(v) || 0))
          }
        ];
      }

      this.chartOptions = {
        series: seriesData,
        chart: {
          type: (tipo === 'line' ? 'line' : 'bar') as any,
          height: 350,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          toolbar: {
            show: true,
            tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false }
          }
        },
        colors: ['#4f46e5', '#06b6d4'],
        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: '45%',
            distributed: tipo === 'bar' && seriesData.length === 1 && datosGrafico.labels.length <= 8
          }
        },
        dataLabels: {
          enabled: false
        },
        xaxis: {
          categories: datosGrafico.labels,
          labels: {
            style: { fontSize: '12px', fontWeight: 600 },
            rotate: -25,
            trim: true
          }
        },
        legend: {
          show: tipo !== 'bar' || seriesData.length > 1
        }
      };
    }
  }

  // Filtrado y Paginación en Tabla
  onFilter(event: Event): void {
    const val = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.filtroBusqueda = val;
    this.pageIndex = 0;

    if (!val) {
      this.datosFiltrados = this.reporteIA?.datos_tabla ? [...this.reporteIA.datos_tabla] : [];
      return;
    }

    if (this.reporteIA?.datos_tabla) {
      this.datosFiltrados = this.reporteIA.datos_tabla.filter(item =>
        Object.values(item).some(field =>
          String(field).toLowerCase().includes(val)
        )
      );
    }
  }

  get datosPaginados(): any[] {
    const start = this.pageIndex * this.pageSize;
    return this.datosFiltrados.slice(start, start + this.pageSize);
  }

  get reporteExportRespuesta(): ReporteRespuesta | null {
    if (!this.reporteIA?.datos_tabla?.length) return null;
    return {
      datos: this.reporteIA.datos_tabla,
      paginacion: {
        total_registros: this.reporteIA.datos_tabla.length,
        total_paginas: 1,
        pagina_actual: 1,
        tiene_anterior: false,
        tiene_siguiente: false
      }
    };
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  // Síntesis de Voz: Narrar dictamen de IA (Text-to-Speech)
  toggleHablarResumen(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.snackBar.open('La síntesis de voz no está soportada en este navegador.', 'OK', { duration: 3000 });
      return;
    }

    if (this.isSpeaking) {
      this.detenerVoz();
    } else if (this.reporteIA?.resumen_ejecutivo) {
      this.speechUtterance = new SpeechSynthesisUtterance(this.reporteIA.resumen_ejecutivo);
      this.speechUtterance.lang = 'es-ES';
      this.speechUtterance.rate = 1.0;
      this.speechUtterance.pitch = 1.0;

      this.speechUtterance.onend = () => {
        this.isSpeaking = false;
        this.cdr.markForCheck();
      };
      this.speechUtterance.onerror = () => {
        this.isSpeaking = false;
        this.cdr.markForCheck();
      };

      this.isSpeaking = true;
      window.speechSynthesis.speak(this.speechUtterance);
    }
  }

  private detenerVoz(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }

  // Handlers para las pestañas de entrada
  onEjecutarNLP(respuesta: NLPRespuesta): void {
    // Si la respuesta proviene de NLP tradicional, intentar consultar la IA para generar el análisis completo
    const query = respuesta.query_interpretada?.['consulta'] || respuesta.query_interpretada?.['intencion'] || 'Reporte de ventas';
    this.ejecutarComandoIA(query);
  }

  onEjecutarQBE(payload: { resultados: ReporteRespuesta; nombre: string }): void {
    this.detenerVoz();
    this.reporteIA = null;
    this.hasChart = false;
    this.chartOptions = null;
    this.resultadosQBE = payload.resultados;
    this.nombreReporte = payload.nombre;
    this.presetActivo = '';
  }

  onTabChange(event: any): void {
    this.tabIndex = event.index;
  }

  ngOnDestroy(): void {
    this.detenerVoz();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
