import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ScryfallService } from '../services/scryfall.service';
import { UserprofileService } from '../services/userprofile.service';
import {
  IonCard, IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon
} from "@ionic/angular/standalone";
import { addIcons } from 'ionicons';
import { ellipsisVertical, add } from 'ionicons/icons';
import { AlertController } from '@ionic/angular/standalone';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-card-details',
  templateUrl: './card-details.page.html',
  styleUrls: ['./card-details.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon
  ]
})
export class CardDetailsPage implements OnInit {
  carta: any;

  constructor(
    private route: ActivatedRoute,
    private scryfallService: ScryfallService,
    private userProfileService: UserprofileService,
    private alertController: AlertController
  ) {
    addIcons({ ellipsisVertical, add });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.scryfallService.obtenerDetallesCarta(id).subscribe(
        data => {
          this.carta = data;
        },
        error => {
          console.error('Error al obtener los detalles de la carta:', error);
        }
      );
    }
  }

  async mostrarOpciones(event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: 'Opciones',
      buttons: [
        {
          text: 'Añadir a Wants',
          handler: () => {
            this.addToWants();
          }
        },
        {
          text: 'Añadir a Sells',
          handler: () => {
            this.addToSells();
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  async addToWants() {
    if (!this.carta) return;

    try {
      const printData = await lastValueFrom(this.scryfallService.getCardPrints(this.carta.name));
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
                  () => this.mostrarMensajeExito('Carta añadida a wants'),
                  error => console.error('Error al añadir carta a wants:', error)
                );
              }
            }
          ]
        });

        await alert.present();
      }
    } catch (error) {
      console.error('Error fetching card editions:', error);
    }
  }

  async addToSells() {
    if (!this.carta) return;

    try {
      const printData = await lastValueFrom(this.scryfallService.getCardPrints(this.carta.name));
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
                  () => this.mostrarMensajeExito('Carta añadida a sells'),
                  error => console.error('Error al añadir carta a sells:', error)
                );
              }
            }
          ]
        });

        await alert.present();
      }
    } catch (error) {
      console.error('Error fetching card editions:', error);
    }
  }

  async mostrarMensajeExito(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Éxito',
      message: mensaje,
      buttons: ['OK']
    });

    await alert.present();
  }
}
