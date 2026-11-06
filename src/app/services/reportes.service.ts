import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { VistaLogica } from '../models/reportes/vista-logica.model';
import { QbePayload } from '../models/reportes/reporte-qbe.model';
import { ReporteRespuesta, NLPRespuesta } from '../models/reportes/reporte-respuesta.model';
import { NLPPayload } from '../models/reportes/reporte-nlp.model';

export interface TranscribeResponse {
  texto_transcrito: string;
}

export interface ReporteIAResponse {
  comando_reconocido: string;
  intencion_detectada: string;
  resumen_ejecutivo: string;
  metricas_kpi: Record<string, any>;
  datos_grafico: {
    tipo_grafico: string; // 'bar' | 'donut' | 'pie' | 'line'
    labels: string[];
    series: any[];
  };
  datos_tabla?: any[];
  columnas_tabla?: Array<{ key: string; label: string }>;
  sugerencias_siguientes_comandos?: string[];
  timestamp?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  getVistas(): Observable<{ vistas: VistaLogica[] }> {
    return this.http.get<{ vistas: VistaLogica[] }>(
      this.configService.getApiUrl('reporte/vistas')
    );
  }

  ejecutarQBE(payload: QbePayload): Observable<ReporteRespuesta> {
    return this.http.post<ReporteRespuesta>(
      this.configService.getApiUrl('reporte/qbe'),
      payload
    );
  }

  ejecutarNLP(payload: NLPPayload): Observable<NLPRespuesta> {
    return this.http.post<NLPRespuesta>(
      this.configService.getApiUrl('reporte/nlp'),
      payload
    );
  }

  transcribirAudio(audio: Blob, filename: string): Observable<TranscribeResponse> {
    const formData = new FormData();
    formData.append('audio', audio, filename);
    return this.http.post<TranscribeResponse>(
      this.configService.getApiUrl('reporte/voz'),
      formData
    );
  }

  // --- CU-15: REPORTES GENERATIVOS CON IA (VOZ Y TEXTO LLM) ---
  ejecutarReporteIA(comando: string): Observable<ReporteIAResponse> {
    const baseUrl = this.configService.getApiBaseUrl();
    const v1Url = baseUrl.replace(/\/api$/, '/api/v1') + '/reportes-voz/comando-texto';
    const compatUrl = baseUrl + '/reportes-voz/comando-texto';

    return this.http.post<ReporteIAResponse>(v1Url, { comando, comando_texto: comando }).pipe(
      catchError(() => this.http.post<ReporteIAResponse>(compatUrl, { comando, comando_texto: comando }))
    );
  }

  ejecutarAudioIA(audioBase64: string, formato: string = 'webm'): Observable<ReporteIAResponse> {
    const baseUrl = this.configService.getApiBaseUrl();
    const v1Url = baseUrl.replace(/\/api$/, '/api/v1') + '/reportes-voz/procesar-audio';
    const compatUrl = baseUrl + '/reportes-voz/procesar-audio';

    return this.http.post<ReporteIAResponse>(v1Url, { audio_base64: audioBase64, formato }).pipe(
      catchError(() => this.http.post<ReporteIAResponse>(compatUrl, { audio_base64: audioBase64, formato }))
    );
  }
}
