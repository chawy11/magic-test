import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private router: Router) {}

  registrar(usuario: any) {
    return this.http.post(`${this.apiUrl}/registro`, usuario).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Ocurrió un error inesperado';
        if (error.status === 400) {
          // Si recibimos el nuevo formato de errores
          if (error.error.errores) {
            return throwError(() => new Error(JSON.stringify(error.error.errores)));
          } else {
            errorMessage = error.error.message;
          }
        }
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  login(credenciales: any) {
    return this.http.post(`${this.apiUrl}/login`, credenciales);
  }

  // In auth.service.ts
  guardarToken(token: string, usuario: string) {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', usuario);
  }

  estaAutenticado(): boolean {
    return !!localStorage.getItem('token');
  }

  cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }
}
