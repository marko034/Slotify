import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trashOutline } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { AdminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../core/api-error';
import { StaffMember } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-admin-staff',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonNote,
    IonSpinner,
    IonText,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/admin" /></ion-buttons>
        <ion-title>Osoblje</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page ion-padding">
        <form [formGroup]="form" (ngSubmit)="add()" class="form">
          <ion-input
            label="Email osobe koja je već registrovana"
            labelPlacement="floating"
            fill="outline"
            type="email"
            formControlName="email"
          />
          <ion-note>Osoba se prvo registruje kao igrač, pa je ovde dodaš. Pri sledećoj prijavi dobija pristup kalendaru.</ion-note>
          <ion-button type="submit" expand="block" [disabled]="form.invalid || saving()">
            @if (saving()) { <ion-spinner name="dots" /> } @else { Dodaj u osoblje }
          </ion-button>
        </form>

        @if (loading() && items().length === 0) {
          <ion-spinner />
        } @else if (items().length === 0) {
          <ion-text color="medium"><p>Nema članova osoblja.</p></ion-text>
        }

        <ion-list>
          @for (m of items(); track m.userId) {
            <ion-item>
              <ion-label>
                <h2>{{ m.fullName || m.email }}</h2>
                <p>{{ m.email }}</p>
              </ion-label>
              <ion-button slot="end" fill="clear" color="danger" aria-label="Ukloni" (click)="remove(m)">
                <ion-icon slot="icon-only" name="trash-outline" />
              </ion-button>
            </ion-item>
          }
        </ion-list>
      </div>
    </ion-content>
  `,
})
export class AdminStaffPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly alerts = inject(AlertController);

  protected readonly items = signal<StaffMember[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    addIcons({ trashOutline });
  }

  ionViewWillEnter(): void {
    this.load();
  }

  protected add(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.api
      .addStaff(this.form.getRawValue().email.trim())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.form.reset({ email: '' });
          void this.toast.success('Dodato u osoblje.');
          this.load();
        },
        error: (e) =>
          void this.toast.error(
            e?.status === 404
              ? 'Nema naloga sa tim emailom. Osoba prvo mora da se registruje.'
              : apiErrorMessage(e),
          ),
      });
  }

  protected async remove(m: StaffMember): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Ukloni iz osoblja?',
      message: m.fullName || m.email,
      buttons: [
        { text: 'Ne', role: 'cancel' },
        {
          text: 'Ukloni',
          role: 'destructive',
          handler: () =>
            this.api.removeStaff(m.userId).subscribe({
              next: () => {
                void this.toast.success('Uklonjeno.');
                this.load();
              },
              error: (e) => void this.toast.error(apiErrorMessage(e)),
            }),
        },
      ],
    });
    await alert.present();
  }

  private load(): void {
    this.loading.set(true);
    this.api
      .listStaff()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.items.set(items),
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }
}