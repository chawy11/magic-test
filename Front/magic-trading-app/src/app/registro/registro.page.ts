import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CustomValidators } from '../validators/form-validators';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel, IonNote,
  IonTitle,
  IonToolbar
} from "@ionic/angular/standalone";

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    ReactiveFormsModule,
    IonItem,
    IonInput,
    IonLabel,
    IonButton,
    RouterLink,
    IonNote
  ]
})
export class RegistroPage {
  registroForm: FormGroup;
  campoTocado: { [key: string]: boolean } = {}; // Para rastrear si un campo ha sido tocado
  errorMessage: { [key: string]: string } = {}; // Propiedad para manejar los mensajes de error específicos

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registroForm = this.fb.group({
      usuario: ['', [Validators.required, Validators.minLength(5)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), CustomValidators.passwordStrength()]],
    });
  }

  // Método para manejar el evento blur
  onBlur(campo: string) {
    this.campoTocado[campo] = true; // Marca el campo como tocado
  }

  // Método para mostrar errores
  mostrarError(campo: string): boolean {
    return ((this.registroForm.get(campo)?.invalid ?? false) && this.campoTocado[campo])
      || !!this.errorMessage[campo];
  }

  onSubmit() {
    // Marca todos los campos como tocados al enviar el formulario
    Object.keys(this.registroForm.controls).forEach((campo) => {
      this.campoTocado[campo] = true;
    });

    // Limpiar mensajes de error previos
    this.errorMessage = {};

    if (this.registroForm.invalid) {
      return; // No envía el formulario si es inválido
    }

    this.authService.registrar(this.registroForm.value).subscribe({
      next: (response) => {
        console.log('Usuario registrado', response);
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error en el registro', error);

        try {
          // Intentar parsear el mensaje como JSON (lista de errores)
          const errores = JSON.parse(error.message);
          errores.forEach((err: string) => {
            if (err.includes('email')) {
              this.errorMessage['email'] = err;
              this.registroForm.get('email')?.reset();
            }
            if (err.includes('nombre de usuario')) {
              this.errorMessage['usuario'] = err;
              this.registroForm.get('usuario')?.reset();
            }
          });
        } catch (e) {
          // Si no es JSON, manejar como antes
          if (error.message === 'El email ya está registrado') {
            this.errorMessage['email'] = error.message;
            this.registroForm.get('email')?.reset();
          } else if (error.message === 'El nombre de usuario ya está registrado') {
            this.errorMessage['usuario'] = error.message;
            this.registroForm.get('usuario')?.reset();
          } else {
            this.errorMessage['general'] = error.message;
          }
        }
      }
    });
  }
}
