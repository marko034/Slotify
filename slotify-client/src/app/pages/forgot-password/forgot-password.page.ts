import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonInput, IonSpinner, IonText, IonTitle, IonToolbar } from '@ionic/angular';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonInput,
    IonButton,
    IonText,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Slotify</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="page form">
        <h2>Zaboravljena lozinka</h2>

        @if (sent()) {
          <p>
            Ako nalog sa tom adresom postoji, poslali smo link za postavljanje nove lozinke.
            Proveri email i spam folder.
          </p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="form">
            <p>Upiši email adresu naloga, pa ćemo ti poslati link za novu lozinku.</p>
            <ion-input
              label="Email"
              labelPlacement="floating"
              fill="outline"
              type="email"
              autocomplete="email"
              formControlName="email"
            />
            @if (error()) {
              <ion-text color="danger"><p>{{ error() }}</p></ion-text>
            }
            <ion-button type="submit" expand="block" [disabled]="form.invalid || loading()">
              @if (loading()) { <ion-spinner name="dots" /> } @else { Pošalji link }
            </ion-button>
          </form>
        }

        <p class="ion-text-center"><a routerLink="/login">Nazad na prijavu</a></p>
      </div>
    </ion-content>
  `,
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.auth
      .forgotPassword(this.form.getRawValue().email)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.sent.set(true),
        error: (e) => this.error.set(apiErrorMessage(e)),
      });
  }
}