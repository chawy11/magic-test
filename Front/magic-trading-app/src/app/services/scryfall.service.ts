import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ImageOptimizerService } from './image.service';

@Injectable({
  providedIn: 'root',
})
export class ScryfallService {
  private baseUrl: string = 'https://api.scryfall.com';

  constructor(
    private http: HttpClient,
    private imageOptimizer: ImageOptimizerService
  ) {}

  // Método para procesar imágenes de cartas y optimizarlas
  private optimizarImagenesCartas(cartas: any[]): any[] {
    return cartas.map((carta, index) => {
      if (carta.image_uris) {
        // Añadir URLs optimizadas
        carta.optimized_image_uris = {
          small: this.imageOptimizer.getOptimizedImageUrl(carta.image_uris.small, 146),
          normal: this.imageOptimizer.getOptimizedImageUrl(carta.image_uris.normal, 300)
        };
        
        // La primera carta no usa lazy loading (es el LCP)
        carta.isLCP = index === 0;
      }
      return carta;
    });
  }

  // Método para buscar cartas por nombre
  buscarCartas(query: string): Observable<any> {
    const url = `${this.baseUrl}/cards/search?q=${encodeURIComponent(query)}`;
    return this.http.get<any>(url).pipe(
      map(response => {
        if (response.data && Array.isArray(response.data)) {
          response.data = this.optimizarImagenesCartas(response.data);
        }
        return response;
      })
    );
  }

  // Resto de métodos sin cambios
  obtenerDetallesCarta(id: string): Observable<any> {
    const url = `${this.baseUrl}/cards/${id}`;
    return this.http.get<any>(url);
  }

  getCardPrints(cardName: string): Observable<any> {
    const url = `${this.baseUrl}/cards/search?q=!"${encodeURIComponent(cardName)}"&unique=prints`;
    return this.http.get<any>(url);
  }

  getCardPrice(setCode: string, cardName: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cards/search?q=!"${encodeURIComponent(cardName)}" set:${setCode}`);
  }
}