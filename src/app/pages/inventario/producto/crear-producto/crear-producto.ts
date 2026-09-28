import { Component, OnInit, OnDestroy, Inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subject, takeUntil, switchMap, of } from 'rxjs';

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

  // Manejo de imagen desde el dispositivo
  archivoSeleccionado: File | null = null;
  previewUrl: string | null = null;
  previewFileName: string | null = null;
  previewFileSize: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private configService: ConfigService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CrearProductoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.producto;

    this.form = this.formBuilder.group({
      nombre: [data?.producto?.nombre || '', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      descripcion: [data?.producto?.descripcion || ''],
      precio: [data?.producto?.precio || 150, [Validators.min(0)]],
      activo: [data?.producto?.activo ?? true],
      categoria_id: [data?.producto?.categoria || '', Validators.required],
      marca_id: [data?.producto?.marca || '', Validators.required]
    });

    if (data?.producto?.imagen_principal || data?.producto?.imagen_uri) {
      this.previewUrl = data.producto.imagen_principal || data.producto.imagen_uri;
      this.previewFileName = 'Imagen actual';
    }
  }

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarMarcas();
  }

  ngOnDestroy(): void {
    if (this.previewUrl && this.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Por favor selecciona una imagen válida (JPEG, PNG, WebP)', 'Cerrar', { duration: 3000 });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      this.snackBar.open('La imagen no debe superar los 15MB', 'Cerrar', { duration: 3000 });
      return;
    }

    this.archivoSeleccionado = file;
    this.previewFileName = file.name;
    this.previewFileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    this.previewUrl = URL.createObjectURL(file);
    this.cdr.detectChanges();
  }

  quitarImagen(fileInput?: HTMLInputElement): void {
    if (this.previewUrl && this.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.archivoSeleccionado = null;
    this.previewUrl = null;
    this.previewFileName = null;
    this.previewFileSize = null;
    if (fileInput) {
      fileInput.value = '';
    }
    this.cdr.detectChanges();
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
      precio: Number(formValues.precio || 150),
      activo: formValues.activo,
      categoria_id: Number(formValues.categoria_id),
      marca_id: Number(formValues.marca_id)
    };

    if (this.isEditMode) {
      const prodId = this.data.producto.id;
      this.apiService.update(url, prodId, productoData)
        .pipe(
          switchMap(() => {
            if (this.archivoSeleccionado) {
              return this.subirImagenProducto(prodId);
            }
            return of(null);
          }),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.snackBar.open('Prenda actualizada exitosamente con su imagen', 'OK', { duration: 3000 });
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.isSaving = false;
            console.error('Error updating:', err);
            this.snackBar.open('Error al actualizar la prenda', 'Cerrar', { duration: 5000 });
          }
        });
    } else {
      this.apiService.create<any>(url, productoData)
        .pipe(
          switchMap((createdProd: any) => {
            const nuevoId = createdProd?.id || createdProd?.ropa_id || createdProd?.producto_id;
            if (this.archivoSeleccionado && nuevoId) {
              return this.subirImagenProducto(nuevoId);
            }
            return of(createdProd);
          }),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (response) => {
            this.isSaving = false;
            this.snackBar.open('Prenda creada exitosamente con su imagen', 'OK', { duration: 3000 });
            this.dialogRef.close(response || true);
          },
          error: (err) => {
            this.isSaving = false;
            console.error('Error creating:', err);
            this.snackBar.open('Error al crear la prenda', 'Cerrar', { duration: 5000 });
          }
        });
    }
  }

  private subirImagenProducto(productoId: number) {
    if (!this.archivoSeleccionado) return of(null);

    const formData = new FormData();
    formData.append('archivo', this.archivoSeleccionado);
    formData.append('producto_id', String(productoId));
    formData.append('tipo', 'imagen');
    formData.append('es_principal', 'true');
    formData.append('orden', '0');

    const multimediosUrl = this.configService.getApiUrl('multimedios');
    return this.http.post(multimediosUrl, formData);
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
