// Front/magic-trading-app/src/app/card-list/card-list.page.ts
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ScryfallService } from '../services/scryfall.service';
import { UserprofileService } from '../services/userprofile.service';
import { AlertController } from '@ionic/angular';
import {
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonCol, IonContent, IonGrid, IonHeader,
  IonItem, IonLabel, IonList, IonRow,
  IonSpinner, IonTitle, IonToolbar, IonButton,
  IonIcon, IonActionSheet
} from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { ellipsisVertical, addCircle, cartOutline } from 'ionicons/icons';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-card-list',
  templateUrl: './card-list.page.html',
  styleUrls: ['./card-list.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    CommonModule
  ]
})
export class CardListPage implements OnInit, AfterViewInit {
  cartas: any[] = [];
  loading: boolean = true;
  showActions: string | null = null;
  observer!: IntersectionObserver;
  

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private scryfallService: ScryfallService,
    private userProfileService: UserprofileService,
    private alertController: AlertController
  ) {
    addIcons({ ellipsisVertical, addCircle, cartOutline });
  }

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap.get('q');
    if (query) {
      this.scryfallService.buscarCartas(query).subscribe(
        data => {
          this.cartas = data.data || [];
          // Optimizar las imágenes para la vista de lista
          this.cartas.forEach(carta => {
            // Usar versión small para la vista de lista (más ligera)
            if (carta.image_uris) {
              carta.displayImage = carta.image_uris.small;
            }
          });
          this.loading = false;
          
          // Iniciar carga perezosa después de asignar datos
          setTimeout(() => this.setupLazyLoading(), 100);
        },
        error => {
          this.loading = false;
          console.error('Error al buscar cartas:', error);
        }
      );
    }
  }

  ngAfterViewInit() {
    // La carga perezosa se configurará después de que los datos estén disponibles
  }

  // Configurar observador para carga perezosa de imágenes a mejor resolución
  setupLazyLoading() {
    // Si existe un observador previo, desconectarlo
    if (this.observer) {
      this.observer.disconnect();
    }

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };
    
    this.observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const imgElement = entry.target as HTMLImageElement;
          const fullImage = imgElement.getAttribute('data-full-image');
          
          if (fullImage && imgElement.src !== fullImage) {
            // Cargar la imagen de mayor calidad cuando sea visible
            const preloadImg = new Image();
            preloadImg.onload = () => {
              imgElement.src = fullImage;
            };
            preloadImg.src = fullImage;
            
            // Dejar de observar después de cargar
            observer.unobserve(imgElement);
          }
        }
      });
    }, options);
    
    // Observar todas las imágenes
    const images = document.querySelectorAll('.card-image-container img');
    images.forEach(img => {
      this.observer.observe(img);
    });
  }

  irADetalle(carta: any) {
    this.router.navigate(['/card-details', carta.id]);
  }

  async mostrarOpciones(carta: any, event: Event) {
    event.stopPropagation();
    
    // Mostrar un indicador de carga ligero
    const loadingIndicator = await this.alertController.create({
      message: 'Cargando opciones...',
      backdropDismiss: false
    });
    await loadingIndicator.present();
    
    // Ejecutar en el siguiente ciclo de eventos para evitar bloquear el hilo principal
    setTimeout(async () => {
      await loadingIndicator.dismiss();
      
      const actionSheet = await this.alertController.create({
        header: carta.name,
        buttons: [
          {
            text: 'Añadir a Wants',
            handler: () => {
              this.addToWants(carta);
            }
          },
          {
            text: 'Añadir a Sells',
            handler: () => {
              this.addToSells(carta);
            }
          },
          {
            text: 'Cancelar',
            role: 'cancel'
          }
        ]
      });

      await actionSheet.present();
    }, 0);
  }

  async addToWants(carta: any) {
    try {
      // Mostrar mensaje de carga para operaciones prolongadas
      const loading = await this.alertController.create({
        message: 'Cargando ediciones...',
        backdropDismiss: false
      });
      await loading.present();
      
      const printData = await lastValueFrom(this.scryfallService.getCardPrints(carta.name));
      await loading.dismiss();
      
      if (printData && printData.data) {
        // Sort by release date (oldest first)
        const sortedPrints = printData.data.sort((a: any, b: any) =>
          new Date(a.released_at).getTime() - new Date(b.released_at).getTime()
        );

        const alert = await this.alertController.create({
          header: 'Seleccionar Edición',
          inputs: sortedPrints.map((print: any, idx: number) => ({
            type: 'radio',
            label: `${print.set_name} (${print.prices?.eur ? print.prices.eur + '€' : 'N/A'})`,
            value: idx,
            checked: idx === 0
          })),
          buttons: [
            {
              text: 'Cancelar',
              role: 'cancel'
            },
            {
              text: 'Añadir',
              handler: (value) => {
                const selectedPrint = sortedPrints[value];
                const price = selectedPrint.prices?.eur || selectedPrint.prices?.usd || 0;

                this.userProfileService.addCardToWants(
                  selectedPrint.id,
                  selectedPrint.name,
                  selectedPrint.set,
                  selectedPrint.set_name,
                  parseFloat(price) || 0
                ).subscribe(
                  () => this.presentAlert('Éxito', 'Carta añadida a wants correctamente'),
                  error => {
                    this.presentAlert('Error', error.error?.message || 'Error al añadir carta a wants');
                    console.error('Error al añadir carta a wants:', error);
                  }
                );
              }
            }
          ]
        });

        await alert.present();
      }
    } catch (error) {
      console.error('Error fetching card editions:', error);
      this.presentAlert('Error', 'No se pudieron cargar las ediciones de la carta');
    }
  }

  async addToSells(carta: any) {
    try {
      // Mostrar mensaje de carga para operaciones prolongadas
      const loading = await this.alertController.create({
        message: 'Cargando ediciones...',
        backdropDismiss: false
      });
      await loading.present();
      
      const printData = await lastValueFrom(this.scryfallService.getCardPrints(carta.name));
      await loading.dismiss();
      
      if (printData && printData.data) {
        // Sort by release date (oldest first)
        const sortedPrints = printData.data.sort((a: any, b: any) =>
          new Date(a.released_at).getTime() - new Date(b.released_at).getTime()
        );

        const alert = await this.alertController.create({
          header: 'Seleccionar Edición',
          inputs: sortedPrints.map((print: any, idx: number) => ({
            type: 'radio',
            label: `${print.set_name} (${print.prices?.eur ? print.prices.eur + '€' : 'N/A'})`,
            value: idx,
            checked: idx === 0
          })),
          buttons: [
            {
              text: 'Cancelar',
              role: 'cancel'
            },
            {
              text: 'Añadir',
              handler: (value) => {
                const selectedPrint = sortedPrints[value];
                const price = selectedPrint.prices?.eur || selectedPrint.prices?.usd || 0;

                this.userProfileService.addCardToSells(
                  selectedPrint.id,
                  selectedPrint.name,
                  selectedPrint.set,
                  selectedPrint.set_name,
                  parseFloat(price) || 0
                ).subscribe(
                  () => this.presentAlert('Éxito', 'Carta añadida a sells correctamente'),
                  error => {
                    this.presentAlert('Error', error.error?.message || 'Error al añadir carta a sells');
                    console.error('Error al añadir carta a sells:', error);
                  }
                );
              }
            }
          ]
        });

        await alert.present();
      }
    } catch (error) {
      console.error('Error fetching card editions:', error);
      this.presentAlert('Error', 'No se pudieron cargar las ediciones de la carta');
    }
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });

    await alert.present();
  }
  
  // Limpieza del observador cuando se destruye el componente
  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}