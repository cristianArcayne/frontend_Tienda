import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MaterialModule } from 'src/app/material.module';
import { BeneficioFidelizacion } from 'src/app/services/cart.service';
import { FidelizacionService } from 'src/app/services/fidelizacion.service';

@Component({
  selector: 'app-mis-beneficios',
  standalone: true,
  imports: [CommonModule, MaterialModule, MatSnackBarModule],
  templateUrl: './mis-beneficios.component.html',
  styleUrls: ['./mis-beneficios.component.scss']
})
export class MisBeneficiosComponent implements OnInit {
  beneficio: BeneficioFidelizacion | null = null;
  cargando = false;

  constructor(
    private fidelizacionService: FidelizacionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarBeneficio();
  }

  cargarBeneficio(): void {
    this.cargando = true;
    this.fidelizacionService.obtenerMiBeneficio().subscribe({
      next: (data) => {
        this.beneficio = data;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar el beneficio de fidelización:', error);
        this.cargando = false;
        this.snackBar.open('Error al cargar tu beneficio de fidelización', 'Cerrar', { duration: 4000 });
      }
    });
  }

  faltante(): number {
    if (!this.beneficio) return 0;
    return Math.max(0, this.beneficio.monto_minimo - this.beneficio.acumulado);
  }

  progreso(): number {
    if (!this.beneficio || this.beneficio.monto_minimo <= 0) return 0;
    return Math.min(100, (this.beneficio.acumulado / this.beneficio.monto_minimo) * 100);
  }
}
