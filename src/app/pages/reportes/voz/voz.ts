import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { VozService } from '../../../services/voz.service';
import { ReportesService } from '../../../services/reportes.service';
import { NLPRespuesta } from '../../../models/reportes/reporte-respuesta.model';

type VozState = 'idle' | 'recording' | 'transcribing' | 'transcribed';

@Component({
  selector: 'app-voz',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
  ],
  templateUrl: './voz.html',
  styleUrl: './voz.scss'
})
export class VozComponent implements OnInit, OnDestroy {
  @Input() isLoading = false;
  @Output() ejecutar = new EventEmitter<NLPRespuesta>();

  state: VozState = 'idle';
  soportado = false;
  duracion = 0;
  procesando = false;
  textoTranscrito = '';
  textoCorregido = '';
  queryInterpretada: Record<string, any> | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private vozService: VozService,
    private reportesService: ReportesService,
    private snackBar: MatSnackBar
  ) {
    this.soportado = this.vozService.isSupported();
  }

  ngOnInit(): void {
    this.vozService.grabando$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.duracion = 0;
      });

    this.vozService.duracion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(seg => {
        this.duracion = seg;
      });

    this.vozService.audioBlob$
      .pipe(takeUntil(this.destroy$))
      .subscribe(blob => {
        this.transcribir(blob);
      });

    this.vozService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => {
        this.state = 'idle';
        this.snackBar.open(err, 'Cerrar', { duration: 5000 });
      });
  }

  toggleMic(): void {
    if (this.state === 'recording') {
      this.state = 'transcribing';
      this.vozService.detener();
    } else {
      this.limpiar();
      this.state = 'recording';
      this.vozService.grabar();
    }
  }

  eliminarGrabacion(): void {
    this.vozService.eliminar();
    this.state = 'idle';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.limpiar();
    this.transcribir(file);
    input.value = '';
  }

  private transcribir(blob: Blob): void {
    this.state = 'transcribing';

    this.reportesService.transcribirAudio(blob, 'audio.webm')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.textoTranscrito = res.texto_transcrito;
          this.textoCorregido = res.texto_transcrito;
          this.state = 'transcribed';
        },
        error: (err) => {
          this.state = 'idle';
          const msg = err.error?.error || err.error?.detail || 'Error al transcribir audio';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      });
  }

  enviarNLP(): void {
    if (!this.textoCorregido.trim() || this.procesando) return;

    this.queryInterpretada = null;
    this.procesando = true;

    this.reportesService.ejecutarNLP({ texto: this.textoCorregido })
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

  limpiar(): void {
    this.textoTranscrito = '';
    this.textoCorregido = '';
    this.queryInterpretada = null;
  }

  ngOnDestroy(): void {
    this.vozService.detener();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
