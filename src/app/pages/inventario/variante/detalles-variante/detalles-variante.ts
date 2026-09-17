import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { VarianteProducto } from '../../../../models/inventario/variante.model';

@Component({
  selector: 'app-detalles-variante',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './detalles-variante.html',
  styleUrl: './detalles-variante.scss'
})
export class DetallesVarianteComponent {
  constructor(
    public dialogRef: MatDialogRef<DetallesVarianteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { variante: VarianteProducto; ocultarCostos?: boolean }
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}
