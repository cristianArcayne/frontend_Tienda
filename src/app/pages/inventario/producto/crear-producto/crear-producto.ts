import { Component, OnInit, OnDestroy, Inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subject, takeUntil } from 'rxjs';

import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';
import { Categoria } from '../../../../models/inventario/categoria.model';
import { Marca } from '../../../../models/inventario/marca.model';
import { Pagination } from '../../../../models/pagination.model';

@Component({
  selector: 'app-crear-producto',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  templateUrl: './crear-producto.html',
  styleUrl: './crear-producto.scss'
})
export class CrearProductoComponent implements OnInit, OnDestroy {
  form: FormGroup;
  categorias: Categoria[] = [];
  marcas: Marca[] = [];
  isSaving = false;
  isEditMode = false;
  isLoadingCategorias = false;
  isLoadingMarcas = false;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CrearProductoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.producto;

    this.form = this.formBuilder.group({
      nombre: [data?.producto?.nombre || '', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      descripcion: [data?.producto?.descripcion || ''],
      activo: [data?.producto?.activo ?? true],
      categoria_id: [data?.producto?.categoria || '', Validators.required],
      marca_id: [data?.producto?.marca || '', Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarMarcas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarCategorias(): void {
    this.isLoadingCategorias = true;
    const url = this.configService.getApiUrl('categorias');

    this.apiService.getWithPagination<Categoria>(url, 1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Categoria>) => {
          this.categorias = data.results;
          this.isLoadingCategorias = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoadingCategorias = false;
          this.snackBar.open('Error al cargar categorías', 'Cerrar', { duration: 5000 });
        }
      });
  }

  private cargarMarcas(): void {
    this.isLoadingMarcas = true;
    const url = this.configService.getApiUrl('marcas');

    this.apiService.getWithPagination<Marca>(url, 1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Marca>) => {
          this.marcas = data.results;
          this.isLoadingMarcas = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoadingMarcas = false;
          this.snackBar.open('Error al cargar marcas', 'Cerrar', { duration: 5000 });
        }
      });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSaving = true;
    const formValues = this.form.value;
    const url = this.configService.getApiUrl('productos');

    const productoData = {
      nombre: formValues.nombre,
      descripcion: formValues.descripcion,
      activo: formValues.activo,
      categoria_id: Number(formValues.categoria_id),
      marca_id: Number(formValues.marca_id)
    };

    if (this.isEditMode) {
      this.apiService.update(url, this.data.producto.id, productoData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.snackBar.open('Producto actualizado exitosamente', 'OK', { duration: 3000 });
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.isSaving = false;
            console.error('Error updating:', err);
            this.snackBar.open('Error al actualizar el producto', 'Cerrar', { duration: 5000 });
          }
        });
    } else {
      this.apiService.create(url, productoData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving = false;
            this.snackBar.open('Producto creado exitosamente', 'OK', { duration: 3000 });
            this.dialogRef.close(response);
          },
          error: (err) => {
            this.isSaving = false;
            console.error('Error creating:', err);
            this.snackBar.open('Error al crear el producto', 'Cerrar', { duration: 5000 });
          }
        });
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
