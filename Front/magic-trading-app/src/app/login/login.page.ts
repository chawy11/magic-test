import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonTitle,
  IonToolbar
} from "@ionic/angular/standalone";

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    ReactiveFormsModule,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    RouterLink,
    IonNote
  ]
})
export class LoginPage {
  loginForm: FormGroup;
  campoTocado: { [key: string]: boolean } = {}; // Para rastrear si un campo ha sido tocado
  mensajeError: string = ''; // Variable para manejar el mensaje de error

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      usuario: ['', [Validators.required]], // Validación para 'usuario'
      password: ['', [Validators.required]], // Validación para 'password'
    });
  }

  // Método para manejar el evento blur
  onBlur(campo: string) {
    this.campoTocado[campo] = true; // Marca el campo como tocado
  }

  // Método para mostrar errores
  mostrarError(campo: string): boolean {
    return (this.loginForm.get(campo)?.invalid ?? false) && this.campoTocado[campo];
  }

  // Enviar el formulario de inicio de sesión
  onSubmit() {
    // Marca todos los campos como tocados
    Object.keys(this.loginForm.controls).forEach((campo) => {
      this.campoTocado[campo] = true;
    });

    // Si el formulario es inválido, no se envía
    if (this.loginForm.invalid) {
      return;
    }

    // Enviar la solicitud de login al backend
    this.authService.login(this.loginForm.value).subscribe(
      (response: any) => {
        console.log('Inicio de sesión exitoso', response);
        this.authService.guardarToken(response.token, response.usuario); // Pass both token and username
        this.router.navigate(['/home']);
      },
      (error) => {
        console.error('Error en el inicio de sesión', error);
        this.mensajeError = error.error.message || 'Usuario o contraseña incorrectos';
        this.loginForm.reset(); // Resetea el formulario para volver a intentarlo
      }
    );
  }
}
