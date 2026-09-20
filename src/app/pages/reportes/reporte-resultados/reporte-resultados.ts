import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ReporteRespuesta } from '../../../models/reportes/reporte-respuesta.model';

export interface QueryInterpretada {
  periodo?: string;
  intencion?: string;
  mensaje?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-reporte-resultados',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule,
    MatProgressSpinnerModule, MatCardModule, MatIconModule,
  ],
  templateUrl: './reporte-resultados.html',
  styleUrl: './reporte-resultados.scss'
})
export class ReporteResultadosComponent {
  @Input() resultados: ReporteRespuesta | null = null;
  @Input() queryInterpretada: QueryInterpretada | null = null;

  get columnas(): string[] {
    if (!this.resultados?.datos?.length) return [];
    return Object.keys(this.resultados.datos[0]);
  }
}
