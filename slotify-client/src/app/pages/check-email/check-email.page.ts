import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonSpinner],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Slotify</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="page form">
        <h2>Proveri email</h2>
        <p>
          Poslali smo link za potvrdu naloga na <strong>{{ email }}</strong>. Link važi 24 sata.
        </p>
        <p>Ne vidiš poruku? Proveri spam folder, ili pošalji link ponovo.</p>

        <ion-button expand="block" fill="outline" [disabled]="sending() || !email" (click)="resend()">
          @if (sending()) { <ion-spinner name="dots" /> } @else { Pošalji ponovo }
        </ion-button>

        <p class="ion-text-center"><a routerLink="/login">Nazad na prijavu</a></p>
      </div>
    </ion-content>
  `,
})
export class CheckEmailPage {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly email = inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '';
  protected readonly sending = signal(false);

  protected resend(): void {
    if (!this.email || this.sending()) return;

    this.sending.set(true);
    this.auth
      .resendConfirmation(this.email)
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: () => void this.toast.success('Poslali smo novi link.'),
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }
}