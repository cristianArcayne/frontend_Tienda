import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MaterialModule } from 'src/app/material.module';
import { ConfiguracionFidelizacion, FidelizacionService } from 'src/app/services/fidelizacion.service';

@Component({
  selector: 'app-fidelizacion-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, MatSnackBarModule],
  templateUrl: './fidelizacion.component.html',
  styleUrl: './fidelizacion.component.scss'
})
export class FidelizacionConfigComponent implements OnInit {
  config: ConfiguracionFidelizacion = {
    monto_minimo_acumulado: 0,
    monto_descuento: 0,
    activo: true
  };

  cargando = false;
  guardando = false;

  constructor(
    private fidelizacionService: FidelizacionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracion();
  }

  cargarConfiguracion(): void {
    this.cargando = true;
    this.fidelizacionService.obtenerConfiguracion().subscribe({
      next: (data) => {
        this.config = data;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar configuración de fidelización:', error);
        this.cargando = false;
        this.snackBar.open('Error al cargar la configuración', 'Cerrar', { duration: 4000 });
      }
    });
  }

  guardar(form: NgForm): void {
    if (form.invalid || this.guardando) return;

    this.guardando = true;
    this.fidelizacionService.actualizarConfiguracion({
      monto_minimo_acumulado: this.config.monto_minimo_acumulado,
      monto_descuento: this.config.monto_descuento,
      activo: this.config.activo
    }).subscribe({
      next: (data) => {
        this.config = data;
        this.guardando = false;
        this.snackBar.open('¡Configuración guardada exitosamente!', 'OK', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error al guardar configuración de fidelización:', error);
        this.guardando = false;
        this.snackBar.open('Error al guardar la configuración', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
