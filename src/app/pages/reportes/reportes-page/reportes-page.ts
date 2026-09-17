import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { QbeBuilderComponent } from '../qbe-builder/qbe-builder';
import { TextoNLPComponent } from '../texto-nlp/texto-nlp';
import { VozComponent } from '../voz/voz';
import { ReporteResultadosComponent } from '../reporte-resultados/reporte-resultados';
import { ReporteExportComponent } from '../reporte-export/reporte-export';
import { ReporteRespuesta, NLPRespuesta } from '../../../models/reportes/reporte-respuesta.model';

@Component({
  selector: 'app-reportes-page',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    QbeBuilderComponent,
    TextoNLPComponent,
    VozComponent,
    ReporteResultadosComponent,
    ReporteExportComponent,
  ],
  templateUrl: './reportes-page.html',
  styleUrl: './reportes-page.scss'
})
export class ReportesPageComponent {
  tabIndex = 0;
  isLoading = false;
  resultados: ReporteRespuesta | null = null;
  queryInterpretada: Record<string, any> | null = null;
  errorMsg: string | null = null;
  nombreReporte = 'reporte';

  onTabChange(event: any): void {
    this.tabIndex = event.index;
    this.limpiarResultados();
  }

  onEjecutarQBE(payload: { resultados: ReporteRespuesta; nombre: string }): void {
    this.resultados = payload.resultados;
    this.queryInterpretada = null;
    this.errorMsg = null;
    this.nombreReporte = payload.nombre;
  }

  onEjecutarNLP(respuesta: NLPRespuesta): void {
    this.resultados = respuesta.resultados;
    this.queryInterpretada = respuesta.query_interpretada;
    this.errorMsg = null;
    this.nombreReporte = 'reporte-nlp';
  }



  limpiarResultados(): void {
    this.resultados = null;
    this.queryInterpretada = null;
    this.errorMsg = null;
  }
}
