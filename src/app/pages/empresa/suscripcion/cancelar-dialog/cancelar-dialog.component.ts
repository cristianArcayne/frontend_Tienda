import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-cancelar-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule
  ],
  templateUrl: './cancelar-dialog.component.html',
  styleUrl: './cancelar-dialog.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class CancelarDialogComponent {
  canceladaPor = '';
  motivo = '';

  constructor(public dialogRef: MatDialogRef<CancelarDialogComponent>) {}

  confirmar(): void {
    if (!this.canceladaPor.trim()) return;
    this.dialogRef.close({ cancelada_por: this.canceladaPor.trim(), motivo: this.motivo });
  }
}
