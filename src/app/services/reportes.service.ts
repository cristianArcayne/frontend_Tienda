import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { VistaLogica } from '../models/reportes/vista-logica.model';
import { QbePayload } from '../models/reportes/reporte-qbe.model';
import { ReporteRespuesta, NLPRespuesta } from '../models/reportes/reporte-respuesta.model';
import { NLPPayload } from '../models/reportes/reporte-nlp.model';

export interface TranscribeResponse {
  texto_transcrito: string;
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
}
