import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Plan } from '../../../../models/empresa/plan.model';
import { Suscripcion } from '../../../../models/empresa/suscripcion.model';

export interface RenovarDialogData {
  suscripcion: Suscripcion;
  plan: Plan;
}

@Component({
  selector: 'app-renovar-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule
  ],
  templateUrl: './renovar-dialog.component.html',
  styleUrl: './renovar-dialog.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class RenovarDialogComponent {
  motivo = '';

  constructor(
    public dialogRef: MatDialogRef<RenovarDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RenovarDialogData
  ) {}

  confirmar(): void {
    this.dialogRef.close({ motivo: this.motivo });
  }
}
