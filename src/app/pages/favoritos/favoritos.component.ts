import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FavoritosService, ProductoFavorito } from 'src/app/services/favoritos.service';
import { ConfigService } from 'src/app/services/config.service';

@Component({
  selector: 'app-favoritos',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
  ],
  templateUrl: './favoritos.component.html',
  styleUrls: ['./favoritos.component.scss']
})
export class FavoritosComponent implements OnInit {
  favoritos: ProductoFavorito[] = [];
  totalFavoritos = 0;
  pageSize = 10;
  pageIndex = 0;
  categorias: any[] = [];
  marcas: any[] = [];
  categoriaFiltro: number | null = null;
  marcaFiltro: number | null = null;
  private snackBar = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    public favoritosService: FavoritosService,
    private configService: ConfigService,
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarMarcas();
    this.cargarPagina();
  }

  cargarCategorias(): void {
    const url = this.configService.getApiUrl('categorias');
    this.http.get<any>(`${url}?page_size=100`).subscribe({
      next: (res) => this.categorias = res.results || [],
      error: () => {}
    });
  }

  cargarMarcas(): void {
    const url = this.configService.getApiUrl('marcas');
    this.http.get<any>(`${url}?page_size=100`).subscribe({
      next: (res) => this.marcas = res.results || [],
      error: () => {}
    });
  }

  cargarPagina(): void {
    this.favoritosService.listar(this.pageIndex + 1, this.pageSize, {
      categoria: this.categoriaFiltro,
      marca: this.marcaFiltro
    }).subscribe({
      next: (res) => {
        this.favoritos = res.results || [];
        this.totalFavoritos = res.count || 0;
      },
      error: () => {
        this.snackBar.open('Error al cargar favoritos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  aplicarFiltros(): void {
    this.pageIndex = 0;
    this.cargarPagina();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.cargarPagina();
  }

  quitarFavorito(favorito: ProductoFavorito): void {
    this.favoritosService.eliminar(favorito.id).subscribe({
      next: () => {
        this.snackBar.open(`${favorito.producto_nombre} eliminado de favoritos`, 'Cerrar', { duration: 2000 });
        this.cargarPagina();
      },
      error: () => {
        this.snackBar.open('Error al eliminar de favoritos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  irACatalogo(): void {
    this.router.navigate(['/extra/catalogo']);
  }
}
