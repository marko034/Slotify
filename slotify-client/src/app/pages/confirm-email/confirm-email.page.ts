import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonSpinner, IonText, IonTitle, IonToolbar } from '@ionic/angular';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner, IonText],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Slotify</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="page form">
        @if (state() === 'loading') {
          <div class="ion-text-center"><ion-spinner /></div>
        } @else if (state() === 'ok') {
          <h2>Email je potvrđen</h2>
          <p>Nalog je aktiviran. Možeš da se prijaviš.</p>
          <ion-button expand="block" routerLink="/login">Prijavi se</ion-button>
        } @else {
          <h2>Potvrda nije uspela</h2>
          <ion-text color="danger"><p>{{ message() }}</p></ion-text>
          <p>Na ekranu za prijavu možeš da zatražiš novi link.</p>
          <ion-button expand="block" routerLink="/login">Na prijavu</ion-button>
        }
      </div>
    </ion-content>
  `,
})
export class ConfirmEmailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly state = signal<'loading' | 'ok' | 'error'>('loading');
  protected readonly message = signal('');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const userId = params.get('userId');
    const token = params.get('token');

    if (!userId || !token) {
      this.message.set('Link nije ispravan.');
      this.state.set('error');
      return;
    }

    this.auth.confirmEmail(userId, token).subscribe({
      next: () => this.state.set('ok'),
      error: (e) => {
        this.message.set(apiErrorMessage(e));
        this.state.set('error');
      },
    });
  }
}