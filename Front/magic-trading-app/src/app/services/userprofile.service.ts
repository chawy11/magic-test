import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserprofileService {
  // Make sure this is set correctly
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getMyProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/profile/me`, { headers: this.getHeaders() });
  }

  // Update these methods to include edition data
  // Update these methods to include price parameter
  addCardToWants(cardId: string, cardName: string, setCode: string = '', setName: string = '', price: number = 0): Observable<any> {
    return this.http.post(`${this.apiUrl}/user/wants`,
      { cardId, cardName, edition: setName, setCode, price },
      { headers: this.getHeaders() }
    );
  }

  addCardToSells(cardId: string, cardName: string, setCode: string = '', setName: string = '', price: number = 0): Observable<any> {
    return this.http.post(`${this.apiUrl}/user/sells`,
      { cardId, cardName, edition: setName, setCode, price },
      { headers: this.getHeaders() }
    );
  }

  // Make sure all these other methods use this.apiUrl as well
  updateCardInWants(cardId: string, quantity: number, edition: string, language: string, foil: boolean, price: number = 0, setCode: string = ''): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/wants/${cardId}`,
      { quantity, edition, language, foil, price, setCode },
      { headers: this.getHeaders() }
    );
  }

  updateCardInSells(cardId: string, quantity: number, edition: string, language: string, foil: boolean, price: number = 0, setCode: string = ''): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/sells/${cardId}`,
      { quantity, edition, language, foil, price, setCode },
      { headers: this.getHeaders() }
    );
  }

  removeCardFromWants(cardId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/user/wants/${cardId}`,
      { headers: this.getHeaders() }
    );
  }

  removeCardFromSells(cardId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/user/sells/${cardId}`,
      { headers: this.getHeaders() }
    );
  }
}
