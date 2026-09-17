import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface EmpresaConfig {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  logoUrl: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionEmpresaService {
  
  private configSubject: BehaviorSubject<EmpresaConfig>;

  constructor() {
    this.configSubject = new BehaviorSubject<EmpresaConfig>(this.getConfiguracion());
  }

  get config$(): Observable<EmpresaConfig> {
    return this.configSubject.asObservable();
  }
  
  private getStorageKey(): string {
    const hostname = window.location.hostname;
    return `config_empresa_${hostname}`;
  }

  getConfiguracion(): EmpresaConfig {
    const key = this.getStorageKey();
    const data = localStorage.getItem(key);
    
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Error parsing company config from localStorage:', e);
      }
    }

    // Default configuration values
    return {
      nombre: '',
      direccion: '',
      telefono: '',
      email: '',
      facebook: '',
      instagram: '',
      tiktok: '',
      logoUrl: null
    };
  }

  saveConfiguracion(config: EmpresaConfig): void {
    const key = this.getStorageKey();
    localStorage.setItem(key, JSON.stringify(config));
    this.configSubject.next(config);
  }
}
