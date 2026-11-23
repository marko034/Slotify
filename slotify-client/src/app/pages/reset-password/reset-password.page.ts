import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import { PASSWORD_HINT, PASSWORD_PATTERN } from '../../core/validators';

@Component({
  selector: 'app-reset-password',
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
    IonNote,
    IonText,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Slotify</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="page form">
        <h2>Nova lozinka</h2>

        @if (done()) {
          <p>Lozinka je promenjena. Prijavi se novom lozinkom.</p>
          <ion-button expand="block" routerLink="/login">Prijavi se</ion-button>
        } @else if (!valid) {
          <ion-text color="danger"><p>Link nije ispravan.</p></ion-text>
          <p class="ion-text-center"><a routerLink="/forgot-password">Zatraži novi link</a></p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="form">
            <ion-input
              label="Nova lozinka"
              labelPlacement="floating"
              fill="outline"
              type="password"
              autocomplete="new-password"
              formControlName="password"
            />
            <ion-note>{{ hint }}</ion-note>
            <ion-input
              label="Ponovi lozinku"
              labelPlacement="floating"
              fill="outline"
              type="password"
              autocomplete="new-password"
              formControlName="repeat"
            />

            @if (error()) {
              <ion-text color="danger"><p>{{ error() }}</p></ion-text>
            }

            <ion-button type="submit" expand="block" [disabled]="form.invalid || loading()">
              @if (loading()) { <ion-spinner name="dots" /> } @else { Sačuvaj lozinku }
            </ion-button>
          </form>
        }
      </div>
    </ion-content>
  `,
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;

  private readonly userId = this.params.get('userId');
  private readonly token = this.params.get('token');

  protected readonly valid = !!this.userId && !!this.token;
  protected readonly hint = PASSWORD_HINT;
  protected readonly loading = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    repeat: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading() || !this.userId || !this.token) return;

    const { password, repeat } = this.form.getRawValue();
    if (password !== repeat) {
      this.error.set('Lozinke se ne poklapaju.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.auth
      .resetPassword(this.userId, this.token, password)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.done.set(true),
        error: (e) => this.error.set(apiErrorMessage(e)),
      });
  }
}