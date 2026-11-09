import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export type EvaluationMode = 'PUDS' | 'ICONIX';

@Injectable({
  providedIn: 'root'
})
export class EvaluationModeService {
  private readonly STORAGE_KEY = 'fashionstore_evaluation_mode';
  private modoSubject = new BehaviorSubject<EvaluationMode>('ICONIX');
  public modo$: Observable<EvaluationMode> = this.modoSubject.asObservable();

  constructor(private router: Router) {
    // 1. Cargar estado guardado o por defecto ICONIX (2do Parcial)
    let saved: EvaluationMode = 'ICONIX';
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(this.STORAGE_KEY);
      if (val === 'PUDS' || val === 'ICONIX') {
        saved = val;
      }
    }
    this.modoSubject.next(saved);

    // 2. Escuchar cambios de ruta para detectar el query param ?modo=puds o ?modo=iconix
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.detectarModoDesdeUrl();
    });
  }

  private detectarModoDesdeUrl(): void {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const paramModo = urlParams.get('modo');
    if (paramModo) {
      if (paramModo.toLowerCase() === 'puds') {
        this.setModo('PUDS');
      } else if (paramModo.toLowerCase() === 'iconix') {
        this.setModo('ICONIX');
      }
    }
  }

  get modoActual(): EvaluationMode {
    return this.modoSubject.value;
  }

  get esPuds(): boolean {
    return this.modoSubject.value === 'PUDS';
  }

  get esIconix(): boolean {
    return this.modoSubject.value === 'ICONIX';
  }

  setModo(modo: EvaluationMode): void {
    if (this.modoSubject.value !== modo) {
      this.modoSubject.next(modo);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, modo);
      }
    }
  }

  toggleModo(): void {
    const nuevo = this.esPuds ? 'ICONIX' : 'PUDS';
    this.setModo(nuevo);
  }
}
