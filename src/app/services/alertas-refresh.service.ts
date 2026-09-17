import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AlertasRefreshService {
  private refresh$ = new Subject<void>();
  readonly alertasRefresh$ = this.refresh$.asObservable();

  emitirRefresh(): void {
    this.refresh$.next();
  }
}
