import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { BeneficioFidelizacion } from './cart.service';

export interface ConfiguracionFidelizacion {
  monto_minimo_acumulado: number;
  monto_descuento: number;
  activo: boolean;
  fecha_actualizacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FidelizacionService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  obtenerMiBeneficio(): Observable<BeneficioFidelizacion> {
    return this.http.get<BeneficioFidelizacion>(
      `${this.configService.getApiUrl('ventas')}mi-beneficio-fidelizacion/`
    );
  }

  obtenerConfiguracion(): Observable<ConfiguracionFidelizacion> {
    return this.http.get<ConfiguracionFidelizacion>(
      this.configService.getApiUrl('configuracion-fidelizacion')
    );
  }

  actualizarConfiguracion(data: Partial<ConfiguracionFidelizacion>): Observable<ConfiguracionFidelizacion> {
    return this.http.put<ConfiguracionFidelizacion>(
      this.configService.getApiUrl('configuracion-fidelizacion'),
      data
    );
  }
}
