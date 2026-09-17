import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pagination } from '../models/pagination.model';

/**
 * Servicio genérico para operaciones CRUD con paginación opcional
 * Compatible con Django REST Framework
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) { }

  /**
   * GET - Obtener lista con paginación
   * @param url - URL del endpoint
   * @param page - Número de página (defecto: 1)
   * @param pageSize - Elementos por página (defecto: 10)
   * @param filters - Filtros adicionales
   */
  getWithPagination<T>(
    url: string,
    page: number = 1,
    pageSize: number = 10,
    filters?: Record<string, any>
  ): Observable<Pagination<T>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] != null && filters[key] !== '') {
          params = params.set(key, String(filters[key]));
        }
      });
    }

    return this.http.get<Pagination<T>>(url, { params });
  }

  /**
   * GET - Obtener lista sin paginación
   * @param url - URL del endpoint
   * @param filters - Filtros adicionales
   */
  getAll<T>(url: string, filters?: Record<string, any>): Observable<T[]> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] != null && filters[key] !== '') {
          params = params.set(key, String(filters[key]));
        }
      });
    }

    return this.http.get<T[]>(url, { params });
  }

  /**
   * GET - Obtener un elemento por ID
   * @param url - URL del endpoint
   * @param id - ID del elemento
   */
  getById<T>(url: string, id: number | string): Observable<T> {
    return this.http.get<T>(`${url}${id}/`);
  }

  /**
   * POST - Crear un nuevo elemento
   * @param url - URL del endpoint
   * @param data - Datos del elemento a crear
   */
  create<T>(url: string, data: any): Observable<T> {
    return this.http.post<T>(url, data);
  }

  /**
   * PUT - Actualizar un elemento existente
   * @param url - URL del endpoint
   * @param id - ID del elemento
   * @param data - Datos a actualizar
   */
  update<T>(url: string, id: number | string, data: any): Observable<T> {
    return this.http.put<T>(`${url}${id}/`, data);
  }

  /**
   * PATCH - Actualización parcial de un elemento
   * @param url - URL del endpoint
   * @param id - ID del elemento
   * @param data - Datos a actualizar
   */
  patch<T>(url: string, id: number | string, data: any): Observable<T> {
    return this.http.patch<T>(`${url}${id}/`, data);
  }

  /**
   * DELETE - Eliminar un elemento
   * @param url - URL del endpoint
   * @param id - ID del elemento
   */
  delete<T>(url: string, id: number | string): Observable<T> {
    return this.http.delete<T>(`${url}${id}/`);
  }

  /**
   * GET - Obtener siguiente página desde URL
   * @param nextUrl - URL de la siguiente página
   */
  getNextPage<T>(nextUrl: string): Observable<Pagination<T>> {
    return this.http.get<Pagination<T>>(nextUrl);
  }

  /**
   * GET - Obtener página anterior desde URL
   * @param previousUrl - URL de la página anterior
   */
  getPreviousPage<T>(previousUrl: string): Observable<Pagination<T>> {
    return this.http.get<Pagination<T>>(previousUrl);
  }
}
