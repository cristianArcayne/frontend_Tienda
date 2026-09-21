import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../../services/config.service';
import { AuthService } from '../../services/auth.service';

export interface MensajeChat {
  emisor: 'usuario' | 'ia';
  texto: string;
  hora: string;
}

@Component({
  selector: 'app-floating-chatbot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './floating-chatbot.component.html',
  styleUrls: ['./floating-chatbot.component.scss']
})
export class FloatingChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatScroll') private chatScrollContainer!: ElementRef;

  isOpen = false;
  unreadCount = 0;
  mensajesChat: MensajeChat[] = [];
  mensajeInput = '';
  enviandoMensaje = false;

  sugerenciasChat: string[] = [
    '¿Qué prendas en oferta tienen hoy?',
    'Sugiéreme un outfit casual',
    '¿Tienen camisas de vestir disponibles?',
    '¿En qué sucursales puedo retirar mis compras?'
  ];

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.inicializarChat();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.unreadCount = 0;
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  inicializarChat(): void {
    this.mensajesChat = [
      {
        emisor: 'ia',
        texto: '¡Hola! 🛍️ Soy tu Personal Shopper con IA de FashionStore. ¿En qué puedo ayudarte hoy?',
        hora: this.getHoraActual()
      }
    ];
  }

  enviarMensajeChat(): void {
    const texto = this.mensajeInput.trim();
    if (!texto || this.enviandoMensaje) return;

    this.mensajesChat.push({
      emisor: 'usuario',
      texto: texto,
      hora: this.getHoraActual()
    });
    this.mensajeInput = '';
    this.enviandoMensaje = true;

    const url = `${this.configService.getApiBaseUrl()}/v1/ia/chat-shopper`;
    const payload = {
      mensaje: texto,
      cliente_id: this.authService.getUsername() || '1'
    };

    this.http.post<any>(url, payload).subscribe({
      next: (res) => {
        this.enviandoMensaje = false;
        this.mensajesChat.push({
          emisor: 'ia',
          texto: res.respuesta_texto || 'Aquí tienes la información sobre tu consulta:',
          hora: this.getHoraActual()
        });
        if (!this.isOpen) {
          this.unreadCount++;
        }
      },
      error: () => {
        this.enviandoMensaje = false;
        this.mensajesChat.push({
          emisor: 'ia',
          texto: 'Disculpa, tuve un problema de conexión. Por favor inténtalo de nuevo.',
          hora: this.getHoraActual()
        });
      }
    });
  }

  usarSugerenciaChat(sug: string): void {
    this.mensajeInput = sug;
    this.enviarMensajeChat();
  }

  private scrollToBottom(): void {
    try {
      if (this.chatScrollContainer) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    } catch (_) {}
  }

  getHoraActual(): string {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
