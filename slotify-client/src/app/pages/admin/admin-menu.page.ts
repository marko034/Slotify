import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-admin-menu',
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Podešavanja</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page">
        <ion-list>
          @for (i of items; track i.path) {
            <ion-item button detail [routerLink]="['/admin', i.path]">
              <ion-label>
                <h2>{{ i.title }}</h2>
                <p>{{ i.description }}</p>
              </ion-label>
            </ion-item>
          }
        </ion-list>
      </div>
    </ion-content>
  `,
})
export class AdminMenuPage {
  protected readonly items = [
    { path: 'venue', title: 'Podaci o sali', description: 'Naziv, adresa i vremenska zona' },
    { path: 'hours', title: 'Radno vreme', description: 'Kada sala radi po danima' },
    { path: 'types', title: 'Vrste stolova', description: 'Trajanje termina, cena i pravila otkazivanja' },
    { path: 'resources', title: 'Stolovi', description: 'Dodavanje, izmena i deaktivacija' },
    { path: 'staff', title: 'Osoblje', description: 'Ko može da upravlja rezervacijama' },
  ];
}