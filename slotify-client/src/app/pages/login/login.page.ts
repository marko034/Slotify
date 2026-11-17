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
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';

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
      <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
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

        <ion-button type="submit" expand="block" [disabled]="form.invalid || loading()">
          @if (loading()) { <ion-spinner name="dots" /> } @else { Prijavi se }
        </ion-button>

        <p class="ion-text-center">Nemaš nalog? <a routerLink="/register">Registruj se</a></p>
      </form>
    </ion-content>
  `,
  styles: [
    `
      .auth-form {
        max-width: 420px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
    `,
  ],
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();

    this.auth
      .login(email, password)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: (e) => this.error.set(apiErrorMessage(e)),
      });
  }
}