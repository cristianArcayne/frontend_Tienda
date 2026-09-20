import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { ConfigService } from '../../../services/config.service';
import { CartService } from '../../../services/cart.service';
import { AuthService } from '../../../services/auth.service';

export interface PrendaSugerida {
  id: number;
  nombre: string;
  precio: number;
  imagen_uri: string;
  categoria_nombre: string;
  razon_recomendacion: string;
}

export interface OutfitRecomendado {
  id: number;
  outfit_nombre: string;
  descripcion_estilo: string;
  ocasion: string;
  score_afinidad: number;
  tipo_algoritmo: string;
  prenda_principal: PrendaSugerida;
  prendas_complementarias: PrendaSugerida[];
  precio_total_outfit: number;
  descuento_combo_aplicable: number;
  precio_final_con_descuento: number;
}

export interface MensajeChat {
  emisor: 'usuario' | 'ia';
  texto: string;
  hora: string;
  outfit?: OutfitRecomendado;
}

@Component({
  selector: 'app-recomendador-ia',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatTabsModule,
    MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule, MatDividerModule
  ],
  templateUrl: './recomendador-ia.component.html',
  styleUrl: './recomendador-ia.component.scss'
})
export class RecomendadorIaComponent implements OnInit {
  // Generador de outfits
  ocasiones: string[] = ['Casual', 'Formal / Gala', 'Deportivo', 'Trabajo / Oficina', 'Fiesta / Noche'];
  ocasionSeleccionada: string = 'Casual';
  prendasDisponibles: any[] = [];
  ropaPrincipalId: number | null = null;
  cargandoOutfit: boolean = false;
  outfitActual: OutfitRecomendado | null = null;
  agregandoAlCarrito: boolean = false;
  feedbackEnviado: boolean = false;

  // Chat Personal Shopper
  mensajesChat: MensajeChat[] = [];
  mensajeInput: string = '';
  enviandoMensaje: boolean = false;
  sugerenciasChat: string[] = [
    '¿Qué outfit me recomiendas para una fiesta elegante?',
    '¿Qué prendas deportivas tienen disponibles?',
    '¿Tienen promociones o descuentos activos hoy?',
    '¿Cuánto cuesta la polera pixel?',
    'Sugiéreme un conjunto casual de fin de semana'
  ];

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private cartService: CartService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarCatalogoPrendas();
    this.inicializarChat();
    this.generarOutfit();
  }

  cargarCatalogoPrendas(): void {
    const url = `${this.configService.getApiBaseUrl()}/catalogo/`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res.results || []);
        this.prendasDisponibles = list.map((p: any) => ({ id: p.id, nombre: p.nombre, imagen: p.imagen_principal || p.imagen_uri }));
      },
      error: () => {}
    });
  }

  inicializarChat(): void {
    this.mensajesChat = [
      {
        emisor: 'ia',
        texto: '¡Hola! Soy tu Personal Shopper con Inteligencia Artificial de FashionStore. ¿Para qué ocasión estás buscando vestir hoy o qué prenda te gustaría combinar?',
        hora: this.getHoraActual()
      }
    ];
  }

  generarOutfit(): void {
    this.cargandoOutfit = true;
    this.feedbackEnviado = false;
    const url = `${this.configService.getApiBaseUrl()}/v1/ia/generar-outfit`;
    const payload: any = {
      ocasion: this.ocasionSeleccionada.split(' ')[0], // ej: Casual, Formal, Deportivo
      cliente_id: this.authService.getUsername() || '1'
    };
    if (this.ropaPrincipalId) {
      payload.ropa_principal_id = this.ropaPrincipalId;
    }

    this.http.post<OutfitRecomendado>(url, payload).subscribe({
      next: (outfit) => {
        this.outfitActual = outfit;
        this.cargandoOutfit = false;
      },
      error: (err) => {
        this.cargandoOutfit = false;
        const msg = err.error?.detail || 'No se pudo generar la recomendación en este momento.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      }
    });
  }

  agregarOutfitAlCarrito(outfit: OutfitRecomendado): void {
    if (!outfit) return;
    this.agregandoAlCarrito = true;
    const ropaIds: number[] = [];
    if (outfit.prenda_principal) ropaIds.push(outfit.prenda_principal.id);
    if (outfit.prendas_complementarias) {
      outfit.prendas_complementarias.forEach(p => ropaIds.push(p.id));
    }

    const url = `${this.configService.getApiBaseUrl()}/v1/ia/outfit-a-carrito`;
    const payload = {
      cliente_id: this.authService.getUsername() || '1',
      ropa_ids: ropaIds
    };

    this.http.post<any>(url, payload).subscribe({
      next: (res) => {
        this.agregandoAlCarrito = false;
        this.cartService.cargarCarrito();
        this.snackBar.open(`¡Outfit añadido! ${res.items_agregados || ropaIds.length} prendas agregadas al carrito con 10% de descuento combo`, 'Ir al Carrito', { duration: 5000 });
      },
      error: () => {
        this.agregandoAlCarrito = false;
        this.snackBar.open('Error al agregar el combo al carrito', 'Cerrar', { duration: 3000 });
      }
    });
  }

  enviarFeedback(aceptada: boolean): void {
    if (!this.outfitActual || this.feedbackEnviado) return;
    const url = `${this.configService.getApiBaseUrl()}/v1/ia/feedback`;
    const payload = {
      recomendacion_id: this.outfitActual.id,
      aceptada: aceptada,
      cliente_id: this.authService.getUsername() || '1'
    };

    this.http.post(url, payload).subscribe({
      next: () => {
        this.feedbackEnviado = true;
        this.snackBar.open(aceptada ? '¡Gracias! Usaremos esto para sugerirte mejores estilos.' : 'Entendido, refinaremos tus preferencias.', 'OK', { duration: 3000 });
      },
      error: () => {}
    });
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
          texto: res.respuesta_texto || 'Aquí tienes mi recomendación de estilo:',
          hora: this.getHoraActual(),
          outfit: res.outfit_recomendado || undefined
        });
      },
      error: () => {
        this.enviandoMensaje = false;
        this.mensajesChat.push({
          emisor: 'ia',
          texto: 'Disculpa, tuve un problema al procesar tu consulta. Por favor inténtalo nuevamente.',
          hora: this.getHoraActual()
        });
      }
    });
  }

  usarSugerenciaChat(sug: string): void {
    this.mensajeInput = sug;
    this.enviarMensajeChat();
  }

  getHoraActual(): string {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getImagenUrl(uri?: string): string {
    if (!uri) return 'assets/images/products/placeholder.jpg';
    if (uri.startsWith('http')) return uri;
    return `${this.configService.getApiBaseUrl()}/${uri.replace(/^\//, '')}`;
  }
}