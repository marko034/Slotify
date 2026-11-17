import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonNote,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
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
    IonNote,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Slotify</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
        <h2>Registracija</h2>
        <ion-input
          label="Ime i prezime"
          labelPlacement="floating"
          fill="outline"
          autocomplete="name"
          formControlName="fullName"
        />
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
          autocomplete="new-password"
          formControlName="password"
        />
        <ion-note>Najmanje 8 znakova, uz bar jednu cifru i jedno malo slovo.</ion-note>

        @if (error()) {
          <ion-text color="danger"><p>{{ error() }}</p></ion-text>
        }

        <ion-button type="submit" expand="block" [disabled]="form.invalid || loading()">
          @if (loading()) { <ion-spinner name="dots" /> } @else { Registruj se }
        </ion-button>

        <p class="ion-text-center">Već imaš nalog? <a routerLink="/login">Prijavi se</a></p>
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
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(/^(?=.*\d)(?=.*[a-z]).{8,}$/)]],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    const { email, password, fullName } = this.form.getRawValue();

    this.auth
      .register(email, password, fullName)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: (e) => this.error.set(apiErrorMessage(e)),
      });
  }
}