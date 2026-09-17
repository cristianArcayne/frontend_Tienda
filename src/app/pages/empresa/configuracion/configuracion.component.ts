import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ConfiguracionEmpresaService, EmpresaConfig } from '../../../services/configuracion-empresa.service';

@Component({
  selector: 'app-configuracion-empresa',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss'
})
export class ConfiguracionComponent implements OnInit {
  
  config: EmpresaConfig = {
    nombre: '',
    direccion: '',
    telefono: '',
    email: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    logoUrl: null
  };

  guardando = false;

  constructor(
    private configuracionService: ConfiguracionEmpresaService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracion();
  }

  cargarConfiguracion(): void {
    this.config = this.configuracionService.getConfiguracion();
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validar tamaño de archivo (Max: 1MB)
      if (file.size > 1024 * 1024) {
        this.snackBar.open('El archivo es demasiado grande. El máximo permitido es 1MB.', 'Cerrar', { duration: 5000 });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.config.logoUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  eliminarLogo(): void {
    this.config.logoUrl = null;
  }

  guardar(form: NgForm): void {
    if (form.invalid || this.guardando) return;

    this.guardando = true;

    // Simular un retardo de red local de 1 segundo para un efecto visual premium
    setTimeout(() => {
      this.configuracionService.saveConfiguracion(this.config);
      this.guardando = false;
      this.snackBar.open('¡Configuración guardada exitosamente!', 'OK', { duration: 3000 });
    }, 1000);
  }
}
