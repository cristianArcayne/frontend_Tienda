import { Component, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ReportesService } from '../../../services/reportes.service';
import { NLPRespuesta } from '../../../models/reportes/reporte-respuesta.model';

@Component({
  selector: 'app-texto-nlp',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './texto-nlp.html',
  styleUrl: './texto-nlp.scss'
})
export class TextoNLPComponent implements OnDestroy {
  @Input() isLoading = false;
  @Output() ejecutar = new EventEmitter<NLPRespuesta>();

  texto = '';
  procesando = false;
  queryInterpretada: Record<string, any> | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private reportesService: ReportesService,
    private snackBar: MatSnackBar
  ) {}

  enviar(): void {
    if (!this.texto.trim() || this.procesando) return;

    this.queryInterpretada = null;
    this.procesando = true;

    this.reportesService.ejecutarNLP({ texto: this.texto })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.procesando = false)
      )
      .subscribe({
        next: (res) => {
          this.queryInterpretada = res.query_interpretada;
          this.ejecutar.emit(res);
          const total = res.resultados?.paginacion?.total_registros || 0;
          this.snackBar.open(`Reporte ejecutado: ${total} registros`, 'OK', { duration: 3000 });
        },
        error: (err) => {
          const msg = err.error?.error || err.error?.detail || 'Error al procesar el texto';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
