import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexDataLabels,
  ApexYAxis,
  ApexTooltip,
  ApexLegend,
  ApexAnnotations,
  ApexGrid
} from 'ng-apexcharts';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ConfigService } from '../../services/config.service';
import { AuthService } from '../../services/auth.service';
import { DashboardIaResponse, ReentrenarResponse } from '../../models/ia/dashboard-ia.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    NgApexchartsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly dashboardUrl: string;
  private readonly reentrenarUrl: string;

  cargando = signal(false);
  reentrenando = signal(false);
  dashboardData = signal<DashboardIaResponse | null>(null);
  categoriaSeleccionada = signal<string>('');
  fechaHasta = signal<Date | null>(null);
  mesesHistorico = signal<number>(12);
  mesesSeleccionado = signal<number>(12);
  mesesPersonalizado = signal<number>(12);
  readonly hoy = new Date();
  isSuperuser = false;

  readonly opcionesMeses = [
    { label: 'Últimos 3 meses', value: 3  },
    { label: 'Últimos 6 meses', value: 6  },
    { label: 'Último año',      value: 12 },
    { label: 'Últimos 2 años',  value: 24 },
    { label: 'Personalizado',   value: 0  },
  ];

  categorias = computed(() => {
    const data = this.dashboardData();
    if (!data) return [];
    const cats = new Set([
      ...data.historico.map(h => h.categoria),
      ...data.proyeccion.map(p => p.categoria)
    ]);
    return Array.from(cats).sort();
  });

  totalUnidades = computed(() => {
    const data = this.dashboardData();
    const cat = this.categoriaSeleccionada();
    if (!data) return 0;
    return data.historico
      .filter(h => !cat || h.categoria === cat)
      .reduce((sum, h) => sum + h.unidades, 0);
  });

  promedioMensual = computed(() => {
    const data = this.dashboardData();
    const cat = this.categoriaSeleccionada();
    if (!data) return 0;
    const items = data.historico.filter(h => !cat || h.categoria === cat);
    if (!items.length) return 0;
    const periodos = new Set(items.map(h => h.periodo)).size;
    return periodos > 0 ? Math.round(this.totalUnidades() / periodos) : 0;
  });

  proyeccionProximoMes = computed(() => {
    const data = this.dashboardData();
    const cat = this.categoriaSeleccionada();
    if (!data) return 0;
    const filtrado = data.proyeccion.filter(p => !cat || p.categoria === cat);
    if (!filtrado.length) return 0;
    const primerPeriodo = [...new Set(filtrado.map(p => p.periodo))].sort()[0];
    return filtrado
      .filter(p => p.periodo === primerPeriodo)
      .reduce((sum, p) => sum + p.unidades, 0);
  });

  // KPIs Ejecutivos CU-16 (MRR SaaS, Rotación, Devoluciones, Ventas)
  kpis = computed(() => this.dashboardData()?.kpis);
  clustering = computed(() => this.kpis()?.clustering_clientes_kmeans);
  modelosML = computed(() => this.kpis()?.modelos_ml);

  // Donut Chart: Clustering K-Means No Supervisado
  clusterChartConfig: ApexChart = {
    type: 'donut',
    height: 240,
    fontFamily: 'inherit',
    animations: { enabled: true }
  };
  clusterLabels: string[] = ['VIP (Alto Valor)', 'Frecuentes (Estables)', 'Nuevos / En Riesgo'];
  clusterColors: string[] = ['#7c3aed', '#0284c7', '#f59e0b'];
  clusterLegend: ApexLegend = { position: 'bottom', fontSize: '12px' };

  clusterSeries = computed(() => {
    const c = this.clustering();
    if (!c) return [2, 1, 10];
    return [c.vip_alto_valor, c.frecuentes_estables, c.nuevos_o_riesgo];
  });

  // ApexCharts
  series: ApexAxisChartSeries = [];
  chartConfig: ApexChart = {
    type: 'line',
    height: 380,
    toolbar: { show: true, tools: { download: true, zoom: false, pan: false, reset: false, zoomin: false, zoomout: false } },
    fontFamily: 'inherit',
    animations: { enabled: true, speed: 400 },
    zoom: { enabled: false }
  };
  xaxis: ApexXAxis = { categories: [], labels: { rotate: -45, style: { fontSize: '11px' } } };
  yaxis: ApexYAxis = { title: { text: 'Unidades' }, min: 0 };
  stroke: ApexStroke = { width: [3, 3], dashArray: [0, 8], curve: 'smooth' };
  colors: string[] = ['#1976d2', '#ff9800'];
  legend: ApexLegend = { position: 'top', horizontalAlign: 'left', fontSize: '13px' };
  annotations: ApexAnnotations = {};
  dataLabels: ApexDataLabels = { enabled: false };
  grid: ApexGrid = { borderColor: '#f1f1f1', strokeDashArray: 3 };
  tooltip: ApexTooltip = { shared: true, intersect: false };

  constructor(
    private apiService: ApiService,
    private http: HttpClient,
    private configService: ConfigService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.dashboardUrl = this.configService.getApiUrl('ia/dashboard');
    this.reentrenarUrl = this.configService.getApiUrl('ia/reentrenar');
  }

  bloqueadoPorPlan = signal(false);
  mensajeBloqueo = signal('');

  get currentEmpresaNombre(): string {
    return this.authService.getEmpresaNombre() || 'Empresa Actual';
  }

  ngOnInit(): void {
    this.isSuperuser = this.authService.isSuperuser();
    this.cargarDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDashboard(): void {
    this.cargando.set(true);
    this.bloqueadoPorPlan.set(false);
    this.mensajeBloqueo.set('');
    let params = new HttpParams().set('meses_historico', this.mesesHistorico().toString());
    const fecha = this.fechaHasta();
    if (fecha) params = params.set('fecha_hasta', this.formatearFecha(fecha));

    this.http.get<DashboardIaResponse>(this.dashboardUrl, { params })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.bloqueadoPorPlan.set(false);
          this.dashboardData.set(data);
          const cats = this.categorias();
          if (cats.length > 0 && !this.categoriaSeleccionada()) {
            this.categoriaSeleccionada.set(cats[0]);
          }
          this.actualizarGrafico();
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          if (err.status === 403) {
            this.bloqueadoPorPlan.set(true);
            const detail = err.error?.detail || 'Este módulo de Inteligencia Artificial no está disponible para el plan actual de la empresa.';
            this.mensajeBloqueo.set(detail);
          } else {
            this.snackBar.open('Error al cargar el dashboard de IA', 'Cerrar', { duration: 3000 });
          }
        }
      });
  }

  onMesesChange(value: number): void {
    this.mesesSeleccionado.set(value);
    if (value !== 0) {
      this.mesesHistorico.set(value);
      this.categoriaSeleccionada.set('');
      this.cargarDashboard();
    }
  }

  onMesesPersonalizadoChange(meses: number): void {
    if (meses >= 1) {
      this.mesesPersonalizado.set(meses);
      this.mesesHistorico.set(meses);
      this.categoriaSeleccionada.set('');
      this.cargarDashboard();
    }
  }

  onCategoriaChange(cat: string): void {
    this.categoriaSeleccionada.set(cat);
    this.actualizarGrafico();
  }

  onFechaChange(date: Date | null): void {
    if (date) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (date < hoy) {
        this.snackBar.open('Selecciona una fecha actual o futura', 'Cerrar', { duration: 3000 });
        return;
      }
    }
    this.fechaHasta.set(date);
    this.cargarDashboard();
  }

  reentrenarModelos(): void {
    this.reentrenando.set(true);
    this.apiService.create<ReentrenarResponse>(this.reentrenarUrl, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.reentrenando.set(false);
          this.snackBar.open(res.detalle, 'Cerrar', { duration: 5000 });
          this.cargarDashboard();
        },
        error: () => {
          this.reentrenando.set(false);
          this.snackBar.open('Error al reentrenar los modelos', 'Cerrar', { duration: 3000 });
        }
      });
  }

  private actualizarGrafico(): void {
    const data = this.dashboardData();
    const cat = this.categoriaSeleccionada();
    if (!data) return;

    const historico = data.historico.filter(h => !cat || h.categoria === cat);
    const proyeccion = data.proyeccion.filter(p => !cat || p.categoria === cat);

    const histMap = new Map<string, number>();
    historico.forEach(h => histMap.set(h.periodo, (histMap.get(h.periodo) ?? 0) + h.unidades));

    const proyMap = new Map<string, number>();
    proyeccion.forEach(p => proyMap.set(p.periodo, (proyMap.get(p.periodo) ?? 0) + p.unidades));

    const allPeriodos = [...new Set([...histMap.keys(), ...proyMap.keys()])].sort();
    const histData: (number | null)[] = allPeriodos.map(p => histMap.has(p) ? (histMap.get(p) ?? null) : null);
    const proyData: (number | null)[] = allPeriodos.map(p => proyMap.has(p) ? (proyMap.get(p) ?? null) : null);

    const histOrdenados = [...histMap.keys()].sort();
    const lastHistPeriodo = histOrdenados[histOrdenados.length - 1];
    const dividerIdx = lastHistPeriodo ? allPeriodos.indexOf(lastHistPeriodo) : -1;

    this.series = [
      { name: 'Histórico', data: histData as number[] },
      { name: 'Proyección', data: proyData as number[] }
    ];
    this.xaxis = { categories: allPeriodos, labels: { rotate: -45, style: { fontSize: '11px' } } };

    if (dividerIdx >= 0 && dividerIdx < allPeriodos.length - 1) {
      this.annotations = {
        xaxis: [{
          x: allPeriodos[dividerIdx],
          strokeDashArray: 5,
          borderColor: '#9e9e9e',
          label: {
            borderColor: '#ff9800',
            offsetY: -10,
            style: { color: '#fff', background: '#ff9800', padding: { left: 6, right: 6, top: 2, bottom: 2 } },
            text: 'Inicio proyección'
          }
        }]
      };
    } else {
      this.annotations = {};
    }
  }

  private formatearFecha(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // =========================================================================
  // CU-16 PARTE 4: COMPUTER VISION Y CLASIFICACIÓN CNN (MobileNetV2)
  // =========================================================================
  modeloVision = signal<'ropa' | 'calzado' | 'objetos'>('ropa');
  imagenPrevia = signal<string | null>(null);
  clasificandoVision = signal<boolean>(false);
  resultadoVision = signal<any | null>(null);
  archivoSeleccionado: File | null = null;

  onModeloVisionChange(tipo: 'ropa' | 'calzado' | 'objetos'): void {
    this.modeloVision.set(tipo);
    this.resultadoVision.set(null);
  }

  onArchivoVisionSeleccionado(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    this.procesarArchivoVision(file);
  }

  procesarArchivoVision(file: File): void {
    this.archivoSeleccionado = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagenPrevia.set(e.target.result);
    };
    reader.readAsDataURL(file);
    this.resultadoVision.set(null);
  }

  cargarEjemploVision(tipo: string): void {
    this.clasificandoVision.set(true);
    this.resultadoVision.set(null);

    let nombreEjemplo = 'ejemplo.jpg';
    let urlImagen = '';

    if (tipo === 'chamarra') {
      nombreEjemplo = 'chamarra_parka_termica.jpg';
      urlImagen = '/assets/images/products/chamarra_usuario.jpg';
      this.modeloVision.set('ropa');
    } else if (tipo === 'camisa') {
      nombreEjemplo = 'camisa_manga_larga_azul.jpg';
      urlImagen = '/assets/images/products/camisa_manga_larga_azul.jpg';
      this.modeloVision.set('ropa');
    } else if (tipo === 'polera') {
      nombreEjemplo = 'polera_cotton_casual.jpg';
      urlImagen = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400';
      this.modeloVision.set('ropa');
    } else if (tipo === 'vestido') {
      nombreEjemplo = 'vestido_gala_seda.jpg';
      urlImagen = 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400';
      this.modeloVision.set('ropa');
    } else if (tipo === 'deportivo') {
      nombreEjemplo = 'calzado_deportivo_sport.jpg';
      urlImagen = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400';
      this.modeloVision.set('ropa');
    }

    this.imagenPrevia.set(urlImagen);

    fetch(urlImagen)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], nombreEjemplo, { type: 'image/jpeg' });
        this.archivoSeleccionado = file;
        this.ejecutarInferenciaVision(file);
      })
      .catch(err => {
        this.snackBar.open('Error al cargar imagen de ejemplo: ' + err.message, 'Cerrar', { duration: 3000 });
        this.clasificandoVision.set(false);
      });
  }

  ejecutarInferenciaVision(fileOverride?: File): void {
    const file = fileOverride || this.archivoSeleccionado;
    if (!file) {
      this.snackBar.open('Por favor selecciona o arrastra una imagen primero', 'Cerrar', { duration: 3000 });
      return;
    }

    this.clasificandoVision.set(true);
    const formData = new FormData();
    formData.append('archivo', file);

    const empresaId = this.authService.getEmpresaId();
    let apiUrl = `${this.configService.getApiBaseUrl()}/v1/ia/busqueda-visual?tipo_modelo=${this.modeloVision()}`;
    if (empresaId) {
      apiUrl += `&empresa_id=${empresaId}`;
    }

    this.http.post<any>(apiUrl, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.clasificandoVision.set(false);
          this.resultadoVision.set(res);
          const diag = res.diagnostico_ia;
          this.snackBar.open(
            `¡Clasificación exitosa! ${diag.clase_detectada} (${diag.confianza_porcentaje}%) en ${diag.tiempo_inferencia_red_ms} ms`,
            'Aceptar',
            { duration: 4500 }
          );
        },
        error: (err) => {
          this.clasificandoVision.set(false);
          const errorMsg = err.error?.detail || err.message || 'Error al conectar con el motor de visión CNN';
          this.snackBar.open(`Error de inferencia: ${errorMsg}`, 'Cerrar', { duration: 5000 });
        }
      });
  }
}
