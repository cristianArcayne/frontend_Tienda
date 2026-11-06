import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { EmpresaPanel } from '../../../../models/empresa/empresa-panel.model';
import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';

@Component({
  selector: 'app-editar-empresa-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './editar-empresa-modal.html',
  styleUrls: ['./editar-empresa-modal.scss'],
})
export class EditarEmpresaModal implements OnInit {
  isSubmitting = false;
  form!: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<EditarEmpresaModal>,
    @Inject(MAT_DIALOG_DATA) public empresa: EmpresaPanel,
    private fb: FormBuilder,
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: [this.empresa.razon_social || this.empresa.nombre || '', [Validators.required, Validators.minLength(3)]],
      nit: [this.empresa.nit || ''],
      subdominio: [this.empresa.subdominio || '', [Validators.required, Validators.pattern(/^[a-z0-9\-]+$/)]],
      correo: [this.empresa.correo || '', [Validators.required, Validators.email]],
      telefono: [this.empresa.telefono || ''],
      ciudad: [this.empresa.ciudad || 'Santa Cruz'],
      direccion: [this.empresa.direccion || ''],
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const val = this.form.value;

    const payload = {
      razon_social: val.nombre.trim(),
      nombre: val.nombre.trim(),
      nit: val.nit ? val.nit.trim() : null,
      subdominio: val.subdominio.trim().toLowerCase(),
      slug: val.subdominio.trim().toLowerCase(),
      correo_contacto: val.correo.trim(),
      correo: val.correo.trim(),
      telefono: val.telefono ? val.telefono.trim() : null,
      ciudad: val.ciudad ? val.ciudad.trim() : 'Santa Cruz',
      direccion: val.direccion ? val.direccion.trim() : null,
    };

    const url = `${this.configService.getApiBaseUrl()}/empresas/${this.empresa.id}`;

    this.apiService.put(url, payload).subscribe({
      next: (resp: any) => {
        this.snackBar.open(
          `Datos de la empresa '${payload.razon_social}' actualizados exitosamente`,
          'Aceptar',
          { duration: 4000 }
        );
        this.isSubmitting = false;
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        const errorMsg =
          err?.error?.detail || err?.message || 'Error al actualizar la empresa';
        this.snackBar.open(errorMsg, 'Cerrar', { duration: 5000 });
        this.isSubmitting = false;
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
