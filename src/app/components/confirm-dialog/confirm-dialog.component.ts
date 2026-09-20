import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface ConfirmDialogData {
  title: string;
  message: string;
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
  color?: 'warn' | 'primary' | 'accent';
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="confirm-dialog-wrapper">
      <div class="confirm-dialog-header">
        <div class="icon-badge" [ngClass]="data.color || 'warn'">
          <mat-icon>{{ data.icon || 'warning' }}</mat-icon>
        </div>
        <h2 mat-dialog-title class="dialog-title">{{ data.title }}</h2>
      </div>

      <mat-dialog-content class="dialog-body">
        <p class="dialog-message">{{ data.message }}</p>
        <p *ngIf="data.subMessage" class="dialog-submessage">{{ data.subMessage }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()" class="btn-cancel">
          {{ data.cancelText || 'Cancelar' }}
        </button>
        <button 
          mat-flat-button 
          [color]="data.color || 'warn'" 
          (click)="onConfirm()" 
          class="btn-confirm">
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog-wrapper {
      padding: 24px 20px 16px;
      text-align: center;
      max-width: 440px;
    }
    .confirm-dialog-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .icon-badge {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }
    .icon-badge.warn {
      background: #fee2e2;
      color: #dc2626;
    }
    .icon-badge.primary {
      background: #e0e7ff;
      color: #4f46e5;
    }
    .icon-badge mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
    .dialog-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
      line-height: 1.3;
    }
    .dialog-body {
      padding: 12px 8px 20px !important;
      color: #64748b;
    }
    .dialog-message {
      font-size: 0.95rem;
      margin: 0 0 6px 0;
      font-weight: 500;
      color: #334155;
    }
    .dialog-submessage {
      font-size: 0.85rem;
      margin: 0;
      color: #94a3b8;
    }
    .dialog-actions {
      padding: 12px 0 0 !important;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn-cancel {
      font-weight: 600;
      color: #64748b;
    }
    .btn-confirm {
      font-weight: 600;
      border-radius: 8px;
      padding: 0 20px;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
