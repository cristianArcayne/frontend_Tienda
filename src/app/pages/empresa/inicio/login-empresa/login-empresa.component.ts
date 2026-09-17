import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-login-empresa-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './login-empresa.component.html',
  styleUrl: './login-empresa.component.scss'
})
export class LoginEmpresaComponent {
  form: FormGroup = this.formBuilder.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]]
  });

  constructor(
    private formBuilder: FormBuilder,
    private dialogRef: MatDialogRef<LoginEmpresaComponent>
  ) {}

  cancelar(): void {
    this.dialogRef.close();
  }

  continuar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.value.nombre);
  }
}
