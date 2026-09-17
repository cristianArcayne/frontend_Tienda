import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { EmpresaPanel } from '../../../../models/empresa/empresa-panel.model';

@Component({
  selector: 'app-suscripcion-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './suscripcion-modal.html',
})
export class SuscripcionModal {
  constructor(
    public dialogRef: MatDialogRef<SuscripcionModal>,
    @Inject(MAT_DIALOG_DATA) public empresa: EmpresaPanel
  ) {}

  getEstadoColor(estado: string): string {
    const map: Record<string, string> = {
      activa: '#2e7d32',
      trial: '#1565c0',
      pausada: '#e65100',
      cancelada: '#c62828',
      expirada: '#757575',
    };
    return map[estado] ?? '#757575';
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}