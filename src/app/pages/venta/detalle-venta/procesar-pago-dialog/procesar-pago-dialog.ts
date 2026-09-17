import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface DialogData {
  total: number;
}

@Component({
  selector: 'app-procesar-pago-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './procesar-pago-dialog.html',
  styleUrl: './procesar-pago-dialog.scss'
})
export class ProcesarPagoDialogComponent {
  // EFECTIVO
  efectivoEntregado = 0;
  vuelto = 0;
  efectivoSuficiente = false;

  // QR
  qrComprobanteNombre: string | null = null;
  qrCargando = false;
  qrVerificado = false;

  // TARJETA
  tarjeta = {
    nombre: '',
    numero: '',
    expiracion: '',
    cvv: ''
  };
  tarjetaProcesando = false;

  constructor(
    public dialogRef: MatDialogRef<ProcesarPagoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  cancelar(): void {
    this.dialogRef.close({ success: false });
  }

  // LÓGICA DE EFECTIVO
  calcularVuelto(): void {
    if (this.efectivoEntregado >= this.data.total) {
      this.vuelto = this.efectivoEntregado - this.data.total;
      this.efectivoSuficiente = true;
    } else {
      this.vuelto = 0;
      this.efectivoSuficiente = false;
    }
  }

  // LÓGICA DE QR
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.qrComprobanteNombre = input.files[0].name;
      this.qrVerificado = false;
    }
  }

  verificarQR(): void {
    if (!this.qrComprobanteNombre || this.qrCargando) return;

    this.qrCargando = true;
    
    // Simular API bancaria que tarda entre 2 y 3 segundos (ej. 2.5 segundos)
    setTimeout(() => {
      this.qrCargando = false;
      this.qrVerificado = true;
    }, 2500);
  }

  // LÓGICA DE TARJETA
  formatearNumeroTarjeta(): void {
    // Eliminar caracteres no numéricos
    let raw = this.tarjeta.numero.replace(/\D/g, '');
    
    // Dividir en grupos de 4 dígitos
    const parts = [];
    for (let i = 0; i < raw.length; i += 4) {
      parts.push(raw.substring(i, i + 4));
    }
    this.tarjeta.numero = parts.join(' ');
  }

  formatearExpiracion(): void {
    let raw = this.tarjeta.expiracion.replace(/\D/g, '');
    if (raw.length > 2) {
      this.tarjeta.expiracion = `${raw.substring(0, 2)}/${raw.substring(2, 4)}`;
    } else {
      this.tarjeta.expiracion = raw;
    }
  }

  procesarTarjeta(form: NgForm): void {
    if (form.invalid || this.tarjetaProcesando) return;

    this.tarjetaProcesando = true;

    // Simular validación bancaria que tarda 2 segundos
    setTimeout(() => {
      this.tarjetaProcesando = false;
      this.confirmarPago('tarjeta');
    }, 2000);
  }

  confirmarPago(metodo: string): void {
    this.dialogRef.close({
      success: true,
      metodo: metodo,
      detalles: {
        montoEntregado: metodo === 'efectivo' ? this.efectivoEntregado : this.data.total,
        vuelto: metodo === 'efectivo' ? this.vuelto : 0
      }
    });
  }
}
