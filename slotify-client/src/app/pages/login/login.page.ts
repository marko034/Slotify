import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { finalize } from 'rxjs';
import { apiErrorCode, apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-login',
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
      <form [formGroup]="form" (ngSubmit)="submit()" class="page form">
        <h2>Prijava</h2>
        <ion-input
          label="Email"
          labelPlacement="floating"
          fill="outline"
          type="email"
          autocomplete="email"
          formControlName="email"
        />
        <ion-input
          label="Lozinka"
          labelPlacement="floating"
          fill="outline"
          type="password"
          autocomplete="current-password"
          formControlName="password"
        />

        @if (error()) {
          <ion-text color="danger"><p>{{ error() }}</p></ion-text>
        }

        @if (notConfirmed()) {
          <ion-button fill="outline" expand="block" [disabled]="resending()" (click)="resend()">
            Pošalji link za potvrdu ponovo
          </ion-button>
        }

        <ion-button type="submit" expand="block" [disabled]="form.invalid || loading()">
          @if (loading()) { <ion-spinner name="dots" /> } @else { Prijavi se }
        </ion-button>

        <p class="ion-text-center"><a routerLink="/forgot-password">Zaboravljena lozinka?</a></p>
        <p class="ion-text-center">Nemaš nalog? <a routerLink="/register">Registruj se</a></p>
      </form>
    </ion-content>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly resending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notConfirmed = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.notConfirmed.set(false);
    const { email, password } = this.form.getRawValue();

    this.auth
      .login(email, password)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: (e) => {
          this.error.set(apiErrorMessage(e));
          this.notConfirmed.set(apiErrorCode(e) === 'email_not_confirmed');
        },
      });
  }

  protected resend(): void {
    const email = this.form.getRawValue().email;
    if (!email || this.resending()) return;

    this.resending.set(true);
    this.auth
      .resendConfirmation(email)
      .pipe(finalize(() => this.resending.set(false)))
      .subscribe({
        next: () => void this.toast.success('Poslali smo novi link. Proveri email.'),
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }
}