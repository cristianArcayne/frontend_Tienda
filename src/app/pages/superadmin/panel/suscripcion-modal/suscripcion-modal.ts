import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { EmpresaPanel } from '../../../../models/empresa/empresa-panel.model';
import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';

@Component({
  selector: 'app-suscripcion-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  templateUrl: './suscripcion-modal.html',
  styleUrls: ['./suscripcion-modal.scss'],
})
export class SuscripcionModal implements OnInit {
  isSaving = false;
  selectedPlanId = 1;
  diasExtension = 30;
  nuevoEstado = 'ACTIVA';
  selectedTabIndex = 0;
  empresa!: EmpresaPanel;

  constructor(
    public dialogRef: MatDialogRef<SuscripcionModal>,
    @Inject(MAT_DIALOG_DATA) public modalData: any,
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.modalData && this.modalData.empresa) {
      this.empresa = this.modalData.empresa;
      this.selectedTabIndex = this.modalData.tabInicial ?? 0;
    } else {
      this.empresa = this.modalData;
      this.selectedTabIndex = 0;
    }

    if (this.empresa.suscripcion_actual?.plan_id) {
      this.selectedPlanId = this.empresa.suscripcion_actual.plan_id;
    }
    this.nuevoEstado = this.empresa.estado || 'ACTIVA';
  }

  getEstadoColor(estado?: string): string {
    const st = (estado || '').toLowerCase();
    if (st === 'activa') return '#16a34a';
    if (st === 'trial') return '#2563eb';
    if (st === 'pausada') return '#ea580c';
    if (st === 'suspendida' || st === 'cancelada') return '#dc2626';
    return '#64748b';
  }

  extenderPeriodo(dias: number): void {
    this.isSaving = true;
    const url = `${this.configService.getApiBaseUrl()}/empresas/${this.empresa.id}/suscripcion/`;
    this.apiService
      .put(url, {
        extender_dias: dias,
        plan_id: this.selectedPlanId,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
            `Periodo extendido exitosamente en +${dias} días para ${this.empresa.nombre}`,
            'Cerrar',
            { duration: 4000 }
          );
          this.isSaving = false;
          this.dialogRef.close(true);
        },
        error: () => {
          this.snackBar.open('Error al extender la suscripción', 'Cerrar', { duration: 4000 });
          this.isSaving = false;
        },
      });
  }

  guardarCambiosPlan(): void {
    this.isSaving = true;
    const url = `${this.configService.getApiBaseUrl()}/empresas/${this.empresa.id}/suscripcion/`;
    this.apiService
      .put(url, {
        plan_id: this.selectedPlanId,
        estado: this.nuevoEstado,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Plan y suscripción actualizados correctamente', 'Cerrar', {
            duration: 3500,
          });
          this.isSaving = false;
          this.dialogRef.close(true);
        },
        error: () => {
          this.snackBar.open('Error al actualizar el plan', 'Cerrar', { duration: 4000 });
          this.isSaving = false;
        },
      });
  }

  abrirEdicion(): void {
    this.dialogRef.close({ abrirEditar: true });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}