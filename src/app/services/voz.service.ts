import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VozService {
  constructor(private ngZone: NgZone) {}

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private grabandoSubject = new Subject<boolean>();
  private audioBlobSubject = new Subject<Blob>();
  private errorSubject = new Subject<string>();
  private duracionSubject = new Subject<number>();
  private timerInterval: any = null;
  private segundos = 0;
  private cancelarGrabacion = false;
  private descartando = false;

  isSupported(): boolean {
    return !!(navigator.mediaDevices && 'MediaRecorder' in window);
  }

  grabar(): void {
    this.cancelarGrabacion = false;
    this.descartando = false;
    this.audioChunks = [];
    this.segundos = 0;
    this.duracionSubject.next(0);

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        if (this.cancelarGrabacion) {
          stream.getTracks().forEach(track => track.stop());
          this.grabandoSubject.next(false);
          return;
        }

        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop());
          clearInterval(this.timerInterval);
          this.ngZone.run(() => {
            if (!this.descartando) {
              const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
              this.audioBlobSubject.next(blob);
            }
            this.grabandoSubject.next(false);
          });
        };

        this.mediaRecorder.onerror = () => {
          stream.getTracks().forEach(track => track.stop());
          clearInterval(this.timerInterval);
          this.ngZone.run(() => {
            this.errorSubject.next('Error al grabar audio.');
            this.grabandoSubject.next(false);
          });
        };

        this.mediaRecorder.start();
        this.grabandoSubject.next(true);

        this.timerInterval = setInterval(() => {
          this.segundos++;
          this.duracionSubject.next(this.segundos);
        }, 1000);
      })
      .catch(err => {
        if (err.name === 'NotAllowedError') {
          this.errorSubject.next('Permiso de micrófono denegado.');
        } else if (err.name === 'NotFoundError') {
          this.errorSubject.next('No se encontró un micrófono.');
        } else {
          this.errorSubject.next('Error al acceder al micrófono.');
        }
      });
  }

  detener(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    } else {
      this.cancelarGrabacion = true;
      this.grabandoSubject.next(false);
    }
  }

  eliminar(): void {
    this.descartando = true;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    } else {
      this.cancelarGrabacion = true;
      this.grabandoSubject.next(false);
    }
  }

  get grabando$(): Observable<boolean> {
    return this.grabandoSubject.asObservable();
  }

  get audioBlob$(): Observable<Blob> {
    return this.audioBlobSubject.asObservable();
  }

  get error$(): Observable<string> {
    return this.errorSubject.asObservable();
  }

  get duracion$(): Observable<number> {
    return this.duracionSubject.asObservable();
  }
}
