import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { PASSWORD_HINT, PASSWORD_PATTERN } from '../../core/validators';
import { VenueStore } from '../../core/venue.store';

const ROLE_LABELS: Record<string, string> = {
  Owner: 'Vlasnik',
  Staff: 'Osoblje',
  Player: 'Igrač',
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonModal,
    IonInput,
    IonNote,
    IonSpinner,
  ],
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

        <div class="ion-padding form">
          <ion-button expand="block" fill="outline" (click)="openChange()">Promena lozinke</ion-button>
          <ion-button expand="block" color="medium" (click)="auth.logout()">Odjavi se</ion-button>
          @if (!auth.isOwner()) {
            <ion-button expand="block" fill="clear" color="danger" (click)="openDelete()">
              Obriši nalog
            </ion-button>
          }
        </div>
      </div>

      <ion-modal [isOpen]="changeOpen()" (didDismiss)="changeOpen.set(false)">
        <ng-template>
          <ion-header>
            <ion-toolbar>
              <ion-title>Promena lozinke</ion-title>
              <ion-buttons slot="end"><ion-button (click)="changeOpen.set(false)">Zatvori</ion-button></ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <form [formGroup]="changeForm" (ngSubmit)="changePassword()" class="form">
              <ion-input
                label="Trenutna lozinka"
                labelPlacement="floating"
                fill="outline"
                type="password"
                autocomplete="current-password"
                formControlName="currentPassword"
              />
              <ion-input
                label="Nova lozinka"
                labelPlacement="floating"
                fill="outline"
                type="password"
                autocomplete="new-password"
                formControlName="newPassword"
              />
              <ion-note>{{ hint }}</ion-note>
              <ion-button type="submit" expand="block" [disabled]="changeForm.invalid || saving()">
                @if (saving()) { <ion-spinner name="dots" /> } @else { Sačuvaj }
              </ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>

      <ion-modal [isOpen]="deleteOpen()" (didDismiss)="deleteOpen.set(false)">
        <ng-template>
          <ion-header>
            <ion-toolbar>
              <ion-title>Brisanje naloga</ion-title>
              <ion-buttons slot="end"><ion-button (click)="deleteOpen.set(false)">Zatvori</ion-button></ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <form [formGroup]="deleteForm" (ngSubmit)="confirmDelete()" class="form">
              <p>
                Nalog se briše trajno, predstojeće rezervacije se otkazuju, a istorija termina ostaje
                bez tvog imena.
              </p>
              <ion-input
                label="Lozinka"
                labelPlacement="floating"
                fill="outline"
                type="password"
                autocomplete="current-password"
                formControlName="password"
              />
              <ion-button type="submit" expand="block" color="danger" [disabled]="deleteForm.invalid || saving()">
                @if (saving()) { <ion-spinner name="dots" /> } @else { Obriši nalog }
              </ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
})
export class ProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly alerts = inject(AlertController);

  protected readonly auth = inject(AuthService);
  protected readonly venue = inject(VenueStore);
  protected readonly hint = PASSWORD_HINT;

  protected readonly changeOpen = signal(false);
  protected readonly deleteOpen = signal(false);
  protected readonly saving = signal(false);

  protected readonly roles = computed(() =>
    (this.auth.user()?.roles ?? []).map((r) => ROLE_LABELS[r] ?? r).join(', '),
  );

  protected readonly changeForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
  });

  protected readonly deleteForm = this.fb.nonNullable.group({
    password: ['', Validators.required],
  });

  protected openChange(): void {
    this.changeForm.reset({ currentPassword: '', newPassword: '' });
    this.changeOpen.set(true);
  }

  protected openDelete(): void {
    this.deleteForm.reset({ password: '' });
    this.deleteOpen.set(true);
  }

  protected changePassword(): void {
    if (this.changeForm.invalid || this.saving()) return;

    const { currentPassword, newPassword } = this.changeForm.getRawValue();
    this.saving.set(true);

    this.auth
      .changePassword(currentPassword, newPassword)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.changeOpen.set(false);
          void this.toast.success('Lozinka je promenjena. Ostali uređaji su odjavljeni.');
        },
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }

  protected async confirmDelete(): Promise<void> {
    if (this.deleteForm.invalid || this.saving()) return;

    const alert = await this.alerts.create({
      header: 'Obrisati nalog?',
      message: 'Ovo ne može da se opozove.',
      buttons: [
        { text: 'Ne', role: 'cancel' },
        { text: 'Obriši', role: 'destructive', handler: () => this.doDelete() },
      ],
    });
    await alert.present();
  }

  private doDelete(): void {
    this.saving.set(true);
    this.auth
      .deleteAccount(this.deleteForm.getRawValue().password)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => void this.toast.success('Nalog je obrisan.'),
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }
}