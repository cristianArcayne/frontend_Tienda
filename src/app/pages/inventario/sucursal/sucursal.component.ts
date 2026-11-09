import { AuthService } from 'src/app/services/auth.service';
import { EvaluationModeService } from 'src/app/services/evaluation-mode.service';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from 'src/app/services/config.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

export interface SucursalItem {
  id: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  empresa_id?: number;
  empresa_nombre?: string;
}

export interface EmpresaItem {
  id: number;
  razon_social: string;
  nit?: string;
  slug?: string;
  plan_nombre?: string;
  limite_sucursales?: number;
  sucursales_activas?: number;
}

@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="sucursales-container">
      <div class="m-b-16 d-flex align-items-center justify-content-between flex-wrap gap-12">
        <div>
          <h2 class="m-b-4 font-weight-bold" style="color: #1e293b;">
            <span *ngIf="evalMode.esPuds">[CU05] Sucursales de la Cadena</span>
            <span *ngIf="evalMode.esIconix">[CU-03] Administrar Sucursales y Puntos de Caja por Empresa</span>
          </h2>
          <p class="text-muted m-0">
            <span *ngIf="evalMode.esPuds">Línea Base PUDS - Tiendas físicas y puntos de atención de FashionStore.</span>
            <span *ngIf="evalMode.esIconix">Administración de tiendas físicas en diferentes ciudades para retiros y ventas presenciales.</span>
          </p>
        </div>
        <button mat-raised-button color="primary" (click)="abrirFormulario()">
          <mat-icon class="m-r-8">add_business</mat-icon>
          Nueva Sucursal
        </button>
      </div>

      <!-- Formulario para Crear / Editar Sucursal -->
      <mat-card *ngIf="mostrarForm" class="m-b-20" style="border: 2px solid #2563eb; box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.1);">
        <mat-card-header>
          <mat-card-title class="d-flex align-items-center gap-8" style="color: #1e293b; font-weight: 700;">
            <mat-icon color="primary">{{ editandoId ? 'edit_location_alt' : 'add_business' }}</mat-icon>
            {{ editandoId ? 'Editar Sucursal #' + editandoId : 'Registrar Nueva Sucursal Física' }}
          </mat-card-title>
          <mat-card-subtitle>Asigne la empresa (Tenant) correspondiente y complete los datos de ubicación física</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="p-t-16">
          
          <!-- Selector de Empresa (Tenant SaaS) -->
          <div *ngIf="evalMode.esIconix" class="m-b-16 p-16 rounded" style="background: #f8fafc; border: 1px solid #e2e8f0;">
            <label style="display: block; font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
              🏢 Empresa (Tenant) a la que pertenece esta sucursal <span style="color: #ef4444;">*</span>
            </label>
            <select 
              [(ngModel)]="formData.empresa_id" 
              (change)="onEmpresaSeleccionadaChange()"
              class="form-select w-full"
              style="padding: 10px 14px; border-radius: 8px; border: 2px solid #cbd5e1; font-size: 14px; font-weight: 600; color: #1e293b; background: white; cursor: pointer; width: 100%;"
              [disabled]="!isSuperAdmin && !!userEmpresaId"
            >
              <option [ngValue]="null" disabled>-- Seleccione la empresa (Tenant) --</option>
              <option *ngFor="let emp of listaEmpresas" [ngValue]="emp.id">
                🏢 {{ emp.razon_social }} — {{ emp.plan_nombre || 'Plan Básico' }} ({{ emp.sucursales_activas || 0 }} de {{ emp.limite_sucursales || 2 }} sucursales) {{ estaEnLimite(emp) ? '⚠️ [LÍMITE ALCANZADO]' : '✅ [CUPO DISPONIBLE]' }}
              </option>
            </select>
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-8 m-t-8">
              <small class="text-muted">
                {{ isSuperAdmin ? 'Como Superadministrador puede registrar sucursales en cualquier organización tenant del SaaS.' : 'Sucursal vinculada a la organización de su cuenta.' }}
              </small>
              <span *ngIf="getEmpresaSeleccionada()" class="badge p-x-8 p-y-4 rounded font-weight-bold" [style.background]="estaEnLimite(getEmpresaSeleccionada()) ? '#fee2e2' : '#ecfdf5'" [style.color]="estaEnLimite(getEmpresaSeleccionada()) ? '#b91c1c' : '#047857'">
                Plan: {{ getEmpresaSeleccionada()?.plan_nombre || 'Plan Básico' }} ({{ getEmpresaSeleccionada()?.sucursales_activas || 0 }} / {{ getEmpresaSeleccionada()?.limite_sucursales || 2 }} sucursales)
              </span>
            </div>
          </div>

          <!-- Alerta Visual de Límite de Suscripción Alcanzado -->
          <div *ngIf="evalMode.esIconix && estaEnLimite(getEmpresaSeleccionada())" class="m-b-16 p-16 rounded" style="background: #fff1f2; border: 2px solid #f43f5e; color: #881337;">
            <div class="d-flex align-items-start gap-12">
              <mat-icon style="color: #e11d48; font-size: 28px; width: 28px; height: 28px;">error</mat-icon>
              <div style="flex: 1;">
                <h4 class="m-0 font-weight-bold" style="color: #9f1239; font-size: 15px;">
                  ⚠️ Límite de Suscripción Alcanzado para {{ getEmpresaSeleccionada()?.razon_social }}
                </h4>
                <p class="m-t-4 m-b-8" style="font-size: 13px; line-height: 1.5; color: #4c0519;">
                  Esta empresa cuenta con el <strong>{{ getEmpresaSeleccionada()?.plan_nombre || 'Plan Básico' }}</strong>, 
                  el cual permite un máximo de <strong>{{ getEmpresaSeleccionada()?.limite_sucursales || 2 }} sucursales físicas activas</strong>. 
                  Actualmente ya tiene registradas <strong>{{ getEmpresaSeleccionada()?.sucursales_activas }} sucursales</strong> en el sistema.
                </p>
                <div class="p-8 rounded" style="background: rgba(255,255,255,0.7); border: 1px dashed #fb7185; font-size: 12px; color: #9f1239; font-weight: 600;">
                  📢 <strong>Regla del SaaS (Ing. Garzón):</strong> Para aperturar o registrar más tiendas físicas, la empresa debe subir o cambiar su suscripción a un plan superior (<strong>Plan Profesional</strong>, que autoriza hasta 10 sucursales con IA Generativa).
                </div>
                <div class="m-t-14 d-flex gap-10 flex-wrap align-items-center">
                  <!-- Botón para Administrador de Empresa (ej. adminDismac, milano_admin) -->
                  <button *ngIf="!isSuperAdmin" mat-flat-button style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; font-weight: 600; padding: 0 16px; height: 38px; border-radius: 8px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);" (click)="irAPanelPlanes()">
                    <mat-icon style="font-size: 18px; width: 18px; height: 18px; margin-right: 6px;">auto_awesome</mat-icon>
                    Subir a Plan Profesional (Hasta 10 Sucursales + IA)
                  </button>

                  <!-- Botón para Superadministrador Global -->
                  <button *ngIf="isSuperAdmin" mat-flat-button color="warn" style="font-size: 12px; height: 36px; padding: 0 14px; border-radius: 6px;" (click)="irAPanelPlanes()">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-right: 4px;">upgrade</mat-icon>
                    Cambiar Plan de la Empresa en Panel SaaS
                  </button>

                  <button mat-stroked-button style="font-size: 12px; height: 36px; color: #4338ca; border-color: #c7d2fe; border-radius: 6px;" (click)="irASuscripcion()">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-right: 4px;">credit_card</mat-icon>
                    Ver Detalles de Suscripción
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Mensaje de Error Backend si falla el registro -->
          <div *ngIf="errorLimiteMensaje" class="m-b-16 p-14 rounded d-flex align-items-center justify-content-between flex-wrap gap-12" style="background: #fef2f2; border: 1px solid #f87171; color: #991b1b; font-size: 13px;">
            <div class="d-flex align-items-center gap-8" style="flex: 1; min-width: 280px;">
              <mat-icon style="color: #dc2626; font-size: 22px; width: 22px; height: 22px; flex-shrink: 0;">report_problem</mat-icon>
              <div>{{ errorLimiteMensaje }}</div>
            </div>
            <div class="d-flex align-items-center gap-8">
              <button mat-flat-button style="background: #e11d48; color: white; font-size: 12px; height: 32px; padding: 0 12px; border-radius: 6px;" (click)="irAPanelPlanes()">
                <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-right: 4px;">upgrade</mat-icon>
                Subir de Plan Ahora
              </button>
              <button mat-icon-button (click)="errorLimiteMensaje = null" style="width: 24px; height: 24px; line-height: 24px;">
                <mat-icon style="font-size: 16px;">close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Campos de la Sucursal -->
          <div class="row" style="display: flex; flex-wrap: wrap; gap: 16px;">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 250px;">
              <mat-label>Nombre de la Sucursal</mat-label>
              <input matInput [(ngModel)]="formData.nombre" placeholder="Ej. Sucursal Equipetrol, Sucursal INDANA" required />
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 200px;">
              <mat-label>Ciudad</mat-label>
              <input matInput [(ngModel)]="formData.ciudad" placeholder="Ej. Santa Cruz, La Paz, Cochabamba" required />
            </mat-form-field>
          </div>

          <div class="row" style="display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px;">
            <mat-form-field appearance="outline" style="flex: 2; min-width: 280px;">
              <mat-label>Dirección</mat-label>
              <input matInput [(ngModel)]="formData.direccion" placeholder="Ej. Av. San Martín esq. Calle 5, Av. Piraí" required />
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 180px;">
              <mat-label>Teléfono / WhatsApp</mat-label>
              <input matInput [(ngModel)]="formData.telefono" placeholder="Ej. +591 3 3344556" required />
            </mat-form-field>
          </div>

          <div class="d-flex justify-content-end gap-12 m-t-16">
            <button mat-button (click)="cancelarFormulario()">Cancelar</button>
            <button 
              mat-raised-button 
              color="primary" 
              [disabled]="!formData.nombre || !formData.ciudad || !formData.empresa_id || guardando || estaEnLimite(getEmpresaSeleccionada())" 
              (click)="guardarSucursal()"
            >
              <mat-icon *ngIf="!guardando">check</mat-icon>
              <mat-spinner *ngIf="guardando" diameter="20"></mat-spinner>
              {{ editandoId ? 'Guardar Cambios' : 'Registrar Sucursal' }}
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Banner de Contexto Multi-Tenant y Filtro por Empresa -->
      <div class="m-b-16 p-12 rounded" style="background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div class="d-flex align-items-center gap-8">
          <mat-icon style="color: #6366f1;">shield</mat-icon>
          <span *ngIf="!tenantFiltroId" style="font-size: 14px; color: #334155; font-weight: 600;">
            Vista Global SuperAdmin: Mostrando todas las sucursales de la plataforma ({{ sucursalesFiltradas.length }} en total).
          </span>
          <span *ngIf="tenantFiltroId" style="font-size: 14px; color: #1e40af; font-weight: 600;">
            Mostrando sucursales exclusivas de: <strong style="color: #2563eb;">{{ obtenerNombreTenantFiltro() }}</strong> (Tenant #{{ tenantFiltroId }})
          </span>
        </div>
        <div class="d-flex align-items-center gap-8" *ngIf="isSuperAdmin">
          <span style="font-size: 12px; color: #64748b; font-weight: 500;">Filtrar por Empresa:</span>
          <select [(ngModel)]="tenantFiltroId" (change)="aplicarFiltroTenant()" style="padding: 6px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; font-weight: 600; color: #1e293b; background: white; cursor: pointer;">
            <option [ngValue]="null">🌍 Todas las Empresas (Global)</option>
            <option *ngFor="let emp of listaEmpresas" [ngValue]="emp.id">🏢 {{ emp.razon_social }} (ID {{ emp.id }})</option>
          </select>
        </div>
      </div>

      <!-- Tabla de Sucursales -->
      <mat-card>
        <mat-card-content>
          <div *ngIf="isLoading" class="d-flex justify-content-center p-y-40">
            <mat-spinner diameter="50"></mat-spinner>
          </div>

          <div *ngIf="!isLoading && sucursales.length > 0" class="table-responsive">
            <table mat-table [dataSource]="sucursalesFiltradas" class="w-full">
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef style="width: 70px;">ID</th>
                <td mat-cell *matCellDef="let element">#{{ element.id }}</td>
              </ng-container>

              <ng-container matColumnDef="empresa">
                <th mat-header-cell *matHeaderCellDef style="min-width: 180px;">Empresa (Tenant)</th>
                <td mat-cell *matCellDef="let element">
                  <span class="badge p-x-10 p-y-4 rounded font-weight-bold" style="background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; display: inline-flex; align-items: center; gap: 4px;">
                    <mat-icon style="font-size: 14px; width: 14px; height: 14px;">business</mat-icon>
                    {{ element.empresa_nombre || ('Empresa #' + element.empresa_id) }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef>Nombre de Sucursal</th>
                <td mat-cell *matCellDef="let element">
                  <div class="d-flex align-items-center gap-8">
                    <mat-icon color="primary">storefront</mat-icon>
                    <strong>{{ element.nombre }}</strong>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="ciudad">
                <th mat-header-cell *matHeaderCellDef>Ciudad</th>
                <td mat-cell *matCellDef="let element">
                  <span class="badge bg-light-primary text-primary p-x-10 p-y-4 rounded font-weight-bold">
                    {{ element.ciudad }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="direccion">
                <th mat-header-cell *matHeaderCellDef>Dirección</th>
                <td mat-cell *matCellDef="let element">{{ element.direccion }}</td>
              </ng-container>

              <ng-container matColumnDef="telefono">
                <th mat-header-cell *matHeaderCellDef>Teléfono</th>
                <td mat-cell *matCellDef="let element">{{ element.telefono || 'Sin teléfono' }}</td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef style="width: 120px; text-align: center;">Acciones</th>
                <td mat-cell *matCellDef="let element" style="text-align: center;">
                  <button mat-icon-button color="primary" matTooltip="Editar datos o empresa de la sucursal" (click)="editarSucursal(element)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" matTooltip="Eliminar sucursal" (click)="eliminarSucursal(element)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <div *ngIf="!isLoading && sucursales.length === 0" class="p-32 text-center text-muted">
            <mat-icon style="font-size: 48px; height: 48px; width: 48px; color: #cbd5e1;">store</mat-icon>
            <h4 class="m-t-12">No hay sucursales registradas</h4>
            <p>Haga clic en "Nueva Sucursal" para añadir una tienda física.</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .badge { display: inline-block; font-size: 13px; }
    .bg-light-primary { background-color: #eff6ff; }
    .text-primary { color: #1d4ed8; }
    .gap-8 { gap: 8px; }
    .gap-12 { gap: 12px; }
  `]
})
export class SucursalComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'empresa', 'nombre', 'ciudad', 'direccion', 'telefono', 'acciones'];
  sucursales: SucursalItem[] = [];
  sucursalesFiltradas: SucursalItem[] = [];
  listaEmpresas: EmpresaItem[] = [];
  tenantFiltroId: number | null = null;
  userEmpresaId: number | null = null;
  isSuperAdmin = true;
  isLoading = false;
  guardando = false;
  mostrarForm = false;
  editandoId: number | null = null;
  editandoEmpresaOriginalId: number | null = null;
  errorLimiteMensaje: string | null = null;

  formData = {
    nombre: '',
    ciudad: '',
    direccion: '',
    telefono: '',
    empresa_id: null as number | null
  };

  private destroy$ = new Subject<void>();
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private authService: AuthService,
    private router: Router,
    public evalMode: EvaluationModeService
  ) {
    const base = this.configService.getApiBaseUrl().replace('/api', '/api/v1');
    this.apiUrl = `${base}/sucursales/`;
  }

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.isSuperuser();
    this.userEmpresaId = this.authService.getEmpresaId();
    this.tenantFiltroId = this.userEmpresaId;
    this.cargarListaEmpresas();
    this.cargarSucursales();
  }

  cargarListaEmpresas(): void {
    const base = this.configService.getApiBaseUrl().replace('/api', '/api/v1');
    this.http.get<any>(`${base}/empresas/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.listaEmpresas = Array.isArray(data) ? data : (data.empresas || []);
          // Si estamos abriendo formulario y aún no hay empresa seleccionada, asignar una por defecto
          if (this.mostrarForm && !this.formData.empresa_id && this.listaEmpresas.length > 0) {
            this.formData.empresa_id = this.tenantFiltroId || this.userEmpresaId || this.listaEmpresas[0].id;
          }
        },
        error: (err) => console.error('Error al cargar empresas:', err)
      });
  }

  aplicarFiltroTenant(): void {
    if (!this.tenantFiltroId) {
      this.sucursalesFiltradas = [...this.sucursales];
    } else {
      this.sucursalesFiltradas = this.sucursales.filter(s => s.empresa_id === this.tenantFiltroId);
    }
  }

  obtenerNombreTenantFiltro(): string {
    const emp = this.listaEmpresas.find(e => e.id === this.tenantFiltroId);
    return emp ? emp.razon_social : `Empresa #${this.tenantFiltroId}`;
  }

  getEmpresaSeleccionada(): EmpresaItem | undefined {
    if (!this.formData.empresa_id) return undefined;
    return this.listaEmpresas.find(e => e.id === Number(this.formData.empresa_id));
  }

  estaEnLimite(empresa?: EmpresaItem): boolean {
    if (!empresa) return false;
    // Si estamos editando y la empresa asignada es la misma original, no incrementa el cupo
    if (this.editandoId && this.editandoEmpresaOriginalId === empresa.id) {
      return false;
    }
    const activas = empresa.sucursales_activas ?? 0;
    const limite = empresa.limite_sucursales ?? 2;
    return activas >= limite;
  }

  onEmpresaSeleccionadaChange(): void {
    this.errorLimiteMensaje = null;
    const emp = this.getEmpresaSeleccionada();
    if (this.estaEnLimite(emp)) {
      this.errorLimiteMensaje = `Límite de suscripción alcanzado: La empresa '${emp?.razon_social}' cuenta con el '${emp?.plan_nombre || 'Plan Básico'}' (máximo ${emp?.limite_sucursales || 2} sucursales). Ya tiene ${emp?.sucursales_activas} activas. Para crear más sucursales debe subir al Plan Profesional.`;
    }
  }

  irAPanelPlanes(): void {
    if (this.isSuperAdmin) {
      this.router.navigate(['/superadmin/panel']);
    } else {
      this.router.navigate(['/suscripcion']);
    }
  }

  irASuscripcion(): void {
    this.router.navigate(['/suscripcion']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarSucursales(): void {
    this.isLoading = true;
    this.http.get<SucursalItem[]>(this.apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.sucursales = data;
          this.aplicarFiltroTenant();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar sucursales:', err);
          this.isLoading = false;
          this.snackBar.open('Error al cargar sucursales', 'Cerrar', { duration: 4000 });
        }
      });
  }

  abrirFormulario(): void {
    this.editandoId = null;
    this.editandoEmpresaOriginalId = null;
    this.errorLimiteMensaje = null;
    
    let defaultEmpresaId = this.tenantFiltroId;
    if (!defaultEmpresaId && !this.isSuperAdmin) {
      defaultEmpresaId = this.userEmpresaId;
    }
    if (!defaultEmpresaId && this.listaEmpresas.length > 0) {
      // Buscar primera empresa que no esté en límite, o la primera por defecto
      const disponible = this.listaEmpresas.find(e => !this.estaEnLimite(e));
      defaultEmpresaId = disponible ? disponible.id : this.listaEmpresas[0].id;
    }

    this.formData = {
      nombre: '',
      ciudad: '',
      direccion: '',
      telefono: '',
      empresa_id: defaultEmpresaId || 1
    };
    this.onEmpresaSeleccionadaChange();
    this.mostrarForm = true;
  }

  editarSucursal(item: SucursalItem): void {
    this.editandoId = item.id;
    this.editandoEmpresaOriginalId = item.empresa_id || null;
    this.errorLimiteMensaje = null;
    this.formData = {
      nombre: item.nombre,
      ciudad: item.ciudad,
      direccion: item.direccion,
      telefono: item.telefono || '',
      empresa_id: item.empresa_id || 1
    };
    this.mostrarForm = true;
  }

  cancelarFormulario(): void {
    this.mostrarForm = false;
    this.editandoId = null;
    this.editandoEmpresaOriginalId = null;
    this.errorLimiteMensaje = null;
  }

  guardarSucursal(): void {
    if (!this.formData.nombre || !this.formData.ciudad) return;
    if (!this.formData.empresa_id) {
      this.snackBar.open('Seleccione la empresa para la sucursal', 'Cerrar', { duration: 3000 });
      return;
    }

    const empSel = this.getEmpresaSeleccionada();
    if (this.estaEnLimite(empSel)) {
      this.errorLimiteMensaje = `Límite de suscripción alcanzado: La empresa '${empSel?.razon_social}' cuenta con el '${empSel?.plan_nombre || 'Plan Básico'}' (máximo ${empSel?.limite_sucursales || 2} sucursales físicas permitidas). Actualmente ya tiene ${empSel?.sucursales_activas} registradas. Para registrar más sucursales físicas, debe subir o cambiar la suscripción al Plan Profesional.`;
      this.snackBar.open(this.errorLimiteMensaje, 'Entendido', { duration: 6000 });
      return;
    }

    this.guardando = true;
    this.errorLimiteMensaje = null;

    if (this.editandoId) {
      this.http.put(`${this.apiUrl}${this.editandoId}`, this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarForm = false;
            this.snackBar.open('Sucursal actualizada con éxito', 'OK', { duration: 3000 });
            this.cargarSucursales();
            this.cargarListaEmpresas();
          },
          error: (err) => {
            this.guardando = false;
            const msg = err?.error?.detail || 'Error al actualizar sucursal';
            this.errorLimiteMensaje = msg;
            this.snackBar.open(msg, 'Cerrar', { duration: 6000 });
          }
        });
    } else {
      this.http.post(this.apiUrl, this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarForm = false;
            this.snackBar.open('Sucursal registrada con éxito', 'OK', { duration: 3000 });
            this.cargarSucursales();
            this.cargarListaEmpresas();
          },
          error: (err) => {
            this.guardando = false;
            const msg = err?.error?.detail || 'Error al registrar sucursal';
            this.errorLimiteMensaje = msg;
            this.snackBar.open(msg, 'Cerrar', { duration: 6000 });
          }
        });
    }
  }

  eliminarSucursal(item: SucursalItem): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        titulo: 'Eliminar Sucursal',
        mensaje: `¿Estás seguro de que deseas eliminar la sucursal "${item.nombre}"?`
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmado => {
      if (!confirmado) return;

      this.http.delete(`${this.apiUrl}${item.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Sucursal eliminada con éxito', 'OK', { duration: 3000 });
            this.cargarSucursales();
            this.cargarListaEmpresas();
          },
          error: (err) => {
            this.snackBar.open(err?.error?.detail || 'No se puede eliminar la sucursal porque contiene inventario o ventas', 'Cerrar', { duration: 5000 });
          }
        });
    });
  }
}
