// src/app/profile/profile.page.ts

import { Component, OnInit } from '@angular/core';
import { UserprofileService } from '../services/userprofile.service';
import { ScryfallService } from '../services/scryfall.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem,
  IonLabel, IonList, IonButton, IonInput, IonSelect, IonSelectOption,
  IonSegment, IonSegmentButton, IonSearchbar, IonIcon, IonFab, IonFabButton,
  IonModal, IonGrid, IonRow, IonCol, IonToggle, IonButtons
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { search, add, create, close, trash, ellipsisVertical, arrowBack } from 'ionicons/icons';
import { lastValueFrom } from 'rxjs';
import {RouterLink} from "@angular/router";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonItem,
    IonLabel, IonList, IonButton, IonInput, IonSelect, IonSelectOption,
    IonSegment, IonSegmentButton, IonSearchbar, IonIcon, IonFab, IonFabButton,
    IonModal, IonGrid, IonRow, IonCol, IonToggle, IonButtons, RouterLink
  ]
})
export class ProfilePage implements OnInit {
  currentUser: string = '';
  wantsList: any[] = [];
  sellsList: any[] = [];
  activeSegment: string = 'wants';
  searchTerm: string = '';
  searchResults: any[] = [];
  loading: boolean = false;
  showSearch: boolean = false;
  editingCard: any = null;
  editions: string[] = [];
  languages: string[] = ['English', 'Spanish', 'French', 'German', 'Italian', 'Japanese'];
  isModalOpen: boolean = false;
  printingsMap: { [key: string]: any } = {};

  constructor(
    private userProfileService: UserprofileService,
    private scryfallService: ScryfallService,
    private alertController: AlertController
  ) {
    addIcons({ search, add, create, close, trash, ellipsisVertical, arrowBack });
    this.currentUser = localStorage.getItem('usuario') || '';
  }



  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.userProfileService.getMyProfile().subscribe(
      (data) => {
        if (data) {
          this.wantsList = data.wants || [];
          this.sellsList = data.sells || [];
        }
      },
      error => console.error('Error al cargar el perfil:', error)
    );
  }

  segmentChanged(ev: any): void {
    this.searchTerm = '';
    this.searchResults = [];
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchTerm = '';
      this.searchResults = [];
    }
  }

  searchCards(): void {
    if (this.searchTerm.length < 3) {
      this.searchResults = [];
      return;
    }

    this.loading = true;
    this.scryfallService.buscarCartas(this.searchTerm).subscribe(
      data => {
        this.searchResults = data.data || [];
        this.loading = false;
      },
      error => {
        console.error('Error al buscar cartas:', error);
        this.loading = false;
      }
    );
  }

  async addCardToWants(card: any): Promise<void> {
    try {
      const printData = await lastValueFrom(this.scryfallService.getCardPrints(card.name));

      if (printData && printData.data) {
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
                  () => {
                    this.loadProfile();
                    this.showSearch = false;
                  },
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

  async addCardToSells(card: any): Promise<void> {
    // Same implementation as addCardToWants but for sells
    try {
      const printData = await lastValueFrom(this.scryfallService.getCardPrints(card.name));

      if (printData && printData.data) {
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
                  () => {
                    this.loadProfile();
                    this.showSearch = false;
                  },
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

  async editCard(card: any, type: 'wants' | 'sells') {
    try {
      // Fetch all editions of this card from Scryfall
      const printData = await lastValueFrom(this.scryfallService.getCardPrints(card.cardName));

      // Create a copy of the card for editing
      this.editingCard = {
        ...card,
        type: type,
        quantity: card.quantity || 1,
        foil: card.foil || false,
        price: card.price || 0
      };

      this.printingsMap = {}; // Reset the printings map

      // Update editions list with real editions from Scryfall
      if (printData && printData.data) {
        // Store all printings with edition name as key for easy lookup
        printData.data.forEach((print: any) => {
          this.printingsMap[print.set_name] = print;
        });

        this.editions = printData.data.map((print: any) => print.set_name);
      }

      this.isModalOpen = true;
    } catch (error) {
      console.error('Error fetching card editions for editing:', error);
    }
  }

  onEditionChange(event: any) {
    const selectedEdition = event.detail.value;
    if (this.printingsMap[selectedEdition]) {
      const selectedPrint = this.printingsMap[selectedEdition];
      // Update the price based on the selected edition
      const price = selectedPrint.prices?.eur || selectedPrint.prices?.usd || 0;
      this.editingCard.price = parseFloat(price) || 0;

      // Also update the setCode
      this.editingCard.setCode = selectedPrint.set;
    }
  }

  saveCardChanges() {
    if (!this.editingCard) return;

    // Ensure price is a number
    this.editingCard.price = parseFloat(this.editingCard.price) || 0;

    if (this.editingCard.type === 'wants') {
      this.userProfileService.updateCardInWants(
        this.editingCard.cardId,
        this.editingCard.quantity,
        this.editingCard.edition,
        this.editingCard.language,
        this.editingCard.foil,
        this.editingCard.price,
        this.editingCard.setCode
      ).subscribe(
        () => {
          this.isModalOpen = false;
          this.loadProfile();
        },
        error => console.error('Error al actualizar carta en wants:', error)
      );
    } else {
      this.userProfileService.updateCardInSells(
        this.editingCard.cardId,
        this.editingCard.quantity,
        this.editingCard.edition,
        this.editingCard.language,
        this.editingCard.foil,
        this.editingCard.price,
        this.editingCard.setCode
      ).subscribe(
        () => {
          this.isModalOpen = false;
          this.loadProfile();
        },
        error => console.error('Error al actualizar carta en sells:', error)
      );
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }

  async removeCardFromWants(cardId: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: '¿Estás seguro de que quieres eliminar esta carta de tu lista de wants?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: () => {
            this.userProfileService.removeCardFromWants(cardId).subscribe(
              () => this.loadProfile(),
              error => console.error('Error al eliminar carta de wants:', error)
            );
          }
        }
      ]
    });

    await alert.present();
  }

  async removeCardFromSells(cardId: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: '¿Estás seguro de que quieres eliminar esta carta de tu lista de sells?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: () => {
            this.userProfileService.removeCardFromSells(cardId).subscribe(
              () => this.loadProfile(),
              error => console.error('Error al eliminar carta de sells:', error)
            );
          }
        }
      ]
    });

    await alert.present();
  }
}
