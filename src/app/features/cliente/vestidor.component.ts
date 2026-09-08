import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-vestidor',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="vestidor-layout">
      <!-- HEADER -->
      <div class="vestidor-header">
        <div>
          <span class="portal-badge">PORTAL EXCLUSIVO</span>
          <h1 class="font-serif header-title">Vestidor Virtual Atelier</h1>
          <p class="header-subtitle">
            Colección Otoño / Invierno 2026 • Experiencia de estilismo biométrico y prendas a medida.
          </p>
        </div>
        <div class="client-info" *ngIf="currentUser()">
          <span class="client-greeting">Bienvenida, {{ currentUser()?.nombre }}</span>
          <span class="badge-client">CLIENTE REGISTRADO</span>
        </div>
      </div>

      <!-- BANNER EXPERIENCIA BIOMÉTRICA -->
      <div class="biometric-banner">
        <div class="banner-left">
          <span class="chip-tech">FITTING LAB IA 99.4% FIEL</span>
          <h2 class="font-serif banner-heading">Tu Silueta Digital Calibrada</h2>
          <p class="banner-text">
            Las prendas seleccionadas se ajustan automáticamente a tus medidas corporales almacenadas en la plataforma.
          </p>
        </div>
        <div class="banner-right">
          <button class="btn-reserva">
            <span class="material-symbols-outlined">calendar_month</span>
            AGENDAR CITA EN TIENDA
          </button>
        </div>
      </div>

      <!-- CATÁLOGO DE PRENDAS -->
      <h2 class="section-title font-serif">Piezas de la Colección</h2>
      <div class="products-grid">
        <div class="product-card" *ngFor="let item of prendas">
          <div class="product-img-wrapper">
            <img [src]="item.imagen" [alt]="item.nombre" class="product-img" />
            <span class="badge-price">\${{ item.precio }} USD</span>
          </div>
          <div class="product-info">
            <span class="product-cat">{{ item.categoria }}</span>
            <h3 class="product-title font-serif">{{ item.nombre }}</h3>
            <p class="product-desc">{{ item.descripcion }}</p>
            <div class="product-actions">
              <button class="btn-fit">PROBAR EN SILUETA</button>
              <button class="btn-order">ADQUIRIR</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .vestidor-layout {
      padding: 1.5rem 0;
    }
    .vestidor-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .portal-badge {
      background-color: #eae5d9;
      color: #72624e;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 0.25rem 0.65rem;
      display: inline-block;
      margin-bottom: 0.4rem;
    }
    .header-title {
      font-size: 2.3rem;
      color: #111;
      margin-bottom: 0.25rem;
    }
    .header-subtitle {
      font-size: 0.85rem;
      color: #666;
    }
    .client-info {
      text-align: right;
    }
    .client-greeting {
      display: block;
      font-weight: 600;
      font-size: 0.9rem;
      color: #111;
      margin-bottom: 0.25rem;
    }
    .badge-client {
      background: #e6f4ea;
      color: #137333;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 0.25rem 0.65rem;
    }

    /* BANNER */
    .biometric-banner {
      background: #222;
      color: #fff;
      padding: 2.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
      flex-wrap: wrap;
      gap: 1.5rem;
    }
    .chip-tech {
      font-size: 0.65rem;
      letter-spacing: 0.12em;
      color: #d1b88e;
      font-weight: 700;
      margin-bottom: 0.5rem;
      display: block;
    }
    .banner-heading {
      font-size: 1.8rem;
      margin-bottom: 0.4rem;
    }
    .banner-text {
      font-size: 0.85rem;
      color: #bbb;
      max-width: 500px;
    }
    .btn-reserva {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #ffffff;
      color: #111;
      border: none;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 0.85rem 1.4rem;
      cursor: pointer;
    }

    /* GRID */
    .section-title {
      font-size: 1.75rem;
      color: #111;
      margin-bottom: 1.25rem;
    }
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.75rem;
    }
    .product-card {
      background: #ffffff;
      border: 1px solid #e8e3d8;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .product-img-wrapper {
      position: relative;
      height: 320px;
      overflow: hidden;
      background: #eae5d9;
    }
    .product-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    .product-card:hover .product-img {
      transform: scale(1.03);
    }
    .badge-price {
      position: absolute;
      bottom: 0.75rem;
      right: 0.75rem;
      background: rgba(18, 18, 18, 0.85);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.35rem 0.7rem;
      backdrop-filter: blur(4px);
    }
    .product-info {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .product-cat {
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      color: #8e6d3d;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 0.35rem;
    }
    .product-title {
      font-size: 1.3rem;
      color: #111;
      margin-bottom: 0.4rem;
    }
    .product-desc {
      font-size: 0.8rem;
      color: #666;
      line-height: 1.4;
      margin-bottom: 1.25rem;
      flex: 1;
    }
    .product-actions {
      display: flex;
      gap: 0.5rem;
    }
    .btn-fit {
      flex: 1;
      background: #f1ede5;
      color: #333;
      border: 1px solid #d8d2c4;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.65rem;
      cursor: pointer;
    }
    .btn-order {
      flex: 1;
      background: #111;
      color: #fff;
      border: none;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.65rem;
      cursor: pointer;
    }
  `]
})
export class VestidorComponent {
  private authService = inject(AuthService);
  currentUser = this.authService.currentUser;

  prendas = [
    {
      nombre: 'Saco Estructural Asimétrico',
      categoria: 'Haute Couture',
      precio: 850.00,
      descripcion: 'Confección en lana virgen y caída contemporánea inspirada en la sastrería japonesa.',
      imagen: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80'
    },
    {
      nombre: 'Pantalón Plisado Silueta Amplia',
      categoria: 'Haute Couture',
      precio: 420.00,
      descripcion: 'Corte fluido con pinzas invertidas en tono antracita y caída holgada de alta costura.',
      imagen: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80'
    },
    {
      nombre: 'Trench Coat Minimalista Biométrico',
      categoria: 'Haute Couture',
      precio: 1150.00,
      descripcion: 'Gabardina impermeable con costuras selladas a mano y ajuste anatómico preciso.',
      imagen: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80'
    }
  ];
}
