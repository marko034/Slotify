import { Component, inject } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  listOutline,
  personOutline,
  settingsOutline,
  todayOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="book">
          <ion-icon name="calendar-outline" />
          <ion-label>Rezerviši</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="my-bookings">
          <ion-icon name="list-outline" />
          <ion-label>Moji termini</ion-label>
        </ion-tab-button>
        @if (auth.isStaff()) {
          <ion-tab-button tab="calendar">
            <ion-icon name="today-outline" />
            <ion-label>Kalendar</ion-label>
          </ion-tab-button>
        }
        @if (auth.isOwner()) {
          <ion-tab-button tab="admin">
            <ion-icon name="settings-outline" />
            <ion-label>Sala</ion-label>
          </ion-tab-button>
        }
        <ion-tab-button tab="profile">
          <ion-icon name="person-outline" />
          <ion-label>Profil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage {
  protected readonly auth = inject(AuthService);

  constructor() {
    addIcons({ calendarOutline, listOutline, personOutline, settingsOutline, todayOutline });
  }
}