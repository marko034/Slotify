import { Component, computed, inject } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../../core/auth.service';
import { VenueStore } from '../../core/venue.store';

const ROLE_LABELS: Record<string, string> = {
  Owner: 'Vlasnik',
  Staff: 'Osoblje',
  Player: 'Igrač',
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButton],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Profil</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page">
        <ion-list>
          <ion-item>
            <ion-label>
              <p>Sala</p>
              <h2>{{ venue.venue()?.name ?? '-' }}</h2>
              @if (venue.venue()?.address) { <p>{{ venue.venue()?.address }}</p> }
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <p>Nalog</p>
              <h2>{{ auth.user()?.email }}</h2>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <p>Uloga</p>
              <h2>{{ roles() }}</h2>
            </ion-label>
          </ion-item>
        </ion-list>
        <div class="ion-padding">
          <ion-button expand="block" color="medium" (click)="auth.logout()">Odjavi se</ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .page {
        max-width: 640px;
        margin: 0 auto;
      }
    `,
  ],
})
export class ProfilePage {
  protected readonly auth = inject(AuthService);
  protected readonly venue = inject(VenueStore);

  protected readonly roles = computed(() =>
    (this.auth.user()?.roles ?? []).map((r) => ROLE_LABELS[r] ?? r).join(', '),
  );
}