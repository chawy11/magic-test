import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonTitle,
  IonToolbar,
  IonList, IonIcon,
} from '@ionic/angular/standalone';
import { AuthService } from "../services/auth.service";
import { ScryfallService } from "../services/scryfall.service";
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { Router } from '@angular/router';
import {addIcons} from "ionicons";
import {logOutOutline, personCircleOutline, search} from "ionicons/icons"; // Importa Router para la navegación

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButtons,
    IonButton,
    IonNote,
    IonItem,
    IonLabel,
    IonInput,
    IonList,
    IonIcon,
  ]
})
export class HomePage implements OnInit {
  nombreCarta: string = ''; // Para almacenar lo que el usuario escribe en el input
  searchResults: any[] = []; // Almacenaremos los resultados de la búsqueda de autocompletado
  loading: boolean = false; // Para saber si estamos cargando los resultados de la búsqueda
  errorMessage: string = ''; // Para manejar mensajes de error
  private searchTerms = new Subject<string>(); // Subject para manejar la búsqueda en tiempo real

  constructor(
    private authService: AuthService,
    private scryfallService: ScryfallService,
    private router: Router // Inyecta Router para la navegación
  ) {
    addIcons({search, personCircleOutline, logOutOutline})
  }

  ngOnInit(): void {
    // Configuramos la búsqueda en tiempo real con debounce
    this.searchTerms.pipe(
      debounceTime(300), // Espera 300ms después de cada tecla
      distinctUntilChanged(), // Ignora si el término no cambió
      switchMap(term => {
        this.loading = true;
        return this.scryfallService.buscarCartas(term).pipe(
          catchError(error => {
            this.loading = false;
            this.errorMessage = 'No se encontraron resultados.';
            return of({ data: [] }); // Devuelve un array vacío en caso de error
          })
        );
      })
    ).subscribe(
      data => {
        this.searchResults = data.data || []; // Asigna los resultados o un array vacío
        this.loading = false;
      },
      error => {
        this.loading = false;
        this.errorMessage = 'Error al buscar cartas.';
        console.error('Error al buscar cartas:', error);
      }
    );
  }

  // Función para manejar el cambio de entrada en el campo de búsqueda
  onInputChange(term: string | null | undefined): void {
    const searchTerm = term ?? ''; // Si term es null o undefined, usa una cadena vacía
    this.searchTerms.next(searchTerm); // Envía el término de búsqueda al Subject
  }

  // Función para manejar la selección de una carta del desplegable
  seleccionarCarta(carta: any): void {
    this.router.navigate(['/card-details', carta.id]); // Navega a la página de detalles
  }

  // Función para manejar la búsqueda al presionar "Intro"
  buscarCarta(event?: Event): void {
    if ((!event || (event instanceof KeyboardEvent && event.key === 'Enter')) && this.nombreCarta.trim()) {
      this.router.navigate(['/card-list'], {
        queryParams: { q: this.nombreCarta.trim() }, // Pasa el término de búsqueda como parámetro
      });
    }
  }

  irAPerfil(): void {
    this.router.navigate(['/profile']);
  }

  // Función para cerrar la sesión
  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }
}
