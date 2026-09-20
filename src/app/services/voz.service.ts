import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { ConfigService } from './config.service';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class VozService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private timerInterval: any = null;
  private startTime = 0;
  private descartando = false;
  private cancelarGrabacion = false;
  private recognition: any = null;

  private grabandoSubject = new BehaviorSubject<boolean>(false);
  private audioBlobSubject = new BehaviorSubject<Blob | null>(null);
  private textoEnVivoSubject = new BehaviorSubject<string>('');
  private duracionSubject = new BehaviorSubject<number>(0);
  private errorSubject = new BehaviorSubject<string | null>(null);

  grabando$ = this.grabandoSubject.asObservable();
  audioBlob$ = this.audioBlobSubject.asObservable();
  textoEnVivo$ = this.textoEnVivoSubject.asObservable();
  duracion$ = this.duracionSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );
  }

  grabar(): Promise<void> {
    return this.iniciar();
  }

  iniciar(): Promise<void> {
    this.descartando = false;
    this.cancelarGrabacion = false;
    this.audioChunks = [];
    this.audioBlobSubject.next(null);
    this.textoEnVivoSubject.next('');
    this.errorSubject.next(null);
    this.duracionSubject.next(0);

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        this.recognition = new SpeechRec();
        this.recognition.lang = 'es-BO';
        this.recognition.continuous = true;
        this.recognition.interimResults = true;

        this.recognition.onresult = (event: any) => {
          let transcrito = '';
          for (let i = 0; i < event.results.length; ++i) {
            transcrito += event.results[i][0].transcript;
          }
          this.textoEnVivoSubject.next(transcrito);
        };

        this.recognition.onerror = (err: any) => {
          console.warn('SpeechRecognition error:', err);
        };

        this.recognition.start();
      } catch (e) {
        console.warn('No se pudo inicializar SpeechRecognition:', e);
      }
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.grabandoSubject.next(true);
      return Promise.resolve();
    }

    return navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.stream = stream;
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }
          clearInterval(this.timerInterval);

          if (this.cancelarGrabacion || this.descartando) {
            this.audioChunks = [];
            this.audioBlobSubject.next(null);
            return;
          }

          if (this.audioChunks.length > 0) {
            const blob = new Blob(this.audioChunks, { type: 'audio/wav' });
            this.audioBlobSubject.next(blob);
          }
        };

        this.mediaRecorder.start();
        this.startTime = Date.now();
        this.grabandoSubject.next(true);

        this.timerInterval = setInterval(() => {
          const secs = Math.floor((Date.now() - this.startTime) / 1000);
          this.duracionSubject.next(secs);
        }, 1000);
      })
      .catch(err => {
        this.errorSubject.next('No se pudo acceder al micrófono: ' + err.message);
        this.grabandoSubject.next(false);
      });
  }

  detener(): void {
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.grabandoSubject.next(false);
  }

  cancelar(): void {
    this.cancelarGrabacion = true;
    if (this.recognition) {
      try { this.recognition.abort(); } catch {}
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    } else {
      this.grabandoSubject.next(false);
    }
  }

  eliminar(): void {
    this.descartando = true;
    if (this.recognition) {
      try { this.recognition.abort(); } catch {}
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    } else {
      this.cancelarGrabacion = true;
      this.grabandoSubject.next(false);
    }
  }

  get grabando(): Observable<boolean> {
    return this.grabando$;
  }

  get audioBlob(): Observable<Blob | null> {
    return this.audioBlob$;
  }

  get textoEnVivo(): Observable<string> {
    return this.textoEnVivo$;
  }

  get error(): Observable<string | null> {
    return this.error$;
  }

  get duracion(): Observable<number> {
    return this.duracion$;
  }
}
