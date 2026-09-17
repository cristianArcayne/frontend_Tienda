import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { ReporteRespuesta } from '../../../models/reportes/reporte-respuesta.model';

@Component({
  selector: 'app-reporte-resultados',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule,
    MatProgressSpinnerModule, MatCardModule,
  ],
  templateUrl: './reporte-resultados.html',
  styleUrl: './reporte-resultados.scss'
})
export class ReporteResultadosComponent {
  @Input() resultados: ReporteRespuesta | null = null;
  @Input() queryInterpretada: Record<string, any> | null = null;

  get columnas(): string[] {
    if (!this.resultados?.datos?.length) return [];
    return Object.keys(this.resultados.datos[0]);
  }
}
