import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImageOptimizerService {
  // URL de la API de optimización de imágenes
  private imageProxyUrl = `${environment.apiUrl}/image-proxy`;
  
  constructor() {}
  
  /**
   * Convierte una URL de imagen a WebP con tamaño optimizado
   */
  getOptimizedImageUrl(originalUrl: string, width?: number): string {
    if (!originalUrl) return '';
    
    // Construir URL para el proxy de imágenes
    let optimizedUrl = `${this.imageProxyUrl}?url=${encodeURIComponent(originalUrl)}`;
    
    // Añadir parámetro de ancho si se especifica
    if (width) {
      optimizedUrl += `&width=${width}`;
    }
    
    return optimizedUrl;
  }
}