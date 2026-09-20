import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  titulo: string;
  mensaje: string;
  submensaje?: string;
  textoBoton?: string;
  colorBoton?: string;
  icono?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <mat-icon [color]="data.colorBoton || 'warn'" style="font-size: 28px; width: 28px; height: 28px;">
        {{ data.icono || (data.colorBoton === 'primary' ? 'help_outline' : 'warning') }}
      </mat-icon>
      <span style="font-weight: 700; color: #1e293b;">{{ data.titulo || 'Confirmar Acción' }}</span>
    </h2>

    <mat-dialog-content class="p-t-8">
      <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.5;">
        {{ data.mensaje }}
      </p>
      <p *ngIf="data.submensaje" style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8;">
        {{ data.submensaje }}
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="p-b-16 p-r-16" style="gap: 8px;">
      <button mat-button (click)="dialogRef.close(false)">
        Cancelar
      </button>
      <button mat-raised-button [color]="data.colorBoton || 'warn'" (click)="dialogRef.close(true)">
        <mat-icon class="m-r-4">{{ data.colorBoton === 'primary' ? 'check' : 'delete' }}</mat-icon>
        {{ data.textoBoton || 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}
}
