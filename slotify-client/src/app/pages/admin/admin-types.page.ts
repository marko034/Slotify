import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, createOutline, trashOutline } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { AdminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../core/api-error';
import { ResourceType } from '../../core/models';
import { formatDuration, formatPrice } from '../../core/time';
import { ToastService } from '../../core/toast.service';

const DEFAULTS = {
  name: '',
  slotMinutes: 30,
  minDurationMinutes: 60,
  maxDurationMinutes: 180,
  maxDaysInAdvance: 30,
  cancellationDeadlineHours: 2,
  pricePerHour: 0,
};

@Component({
  selector: 'app-admin-types',
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
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonModal,
    IonInput,
    IonSpinner,
    IonText,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/admin" /></ion-buttons>
        <ion-title>Vrste stolova</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page">
        @if (loading() && items().length === 0) {
          <div class="ion-padding"><ion-spinner /></div>
        } @else if (items().length === 0) {
          <ion-text color="medium"><p class="ion-padding">Još nema vrsta stolova. Dodaj prvu dugmetom +.</p></ion-text>
        }
        <ion-list>
          @for (t of items(); track t.id) {
            <ion-item>
              <ion-label class="ion-text-wrap">
                <h2>{{ t.name }}</h2>
                <p>Termin {{ t.slotMinutes }} min, rezervacija {{ dur(t.minDurationMinutes) }} do {{ dur(t.maxDurationMinutes) }}</p>
                <p>{{ price(t.pricePerHour) }} po satu, do {{ t.maxDaysInAdvance }} dana unapred, otkazivanje {{ t.cancellationDeadlineHours }} h ranije</p>
              </ion-label>
              <ion-button slot="end" fill="clear" aria-label="Izmeni" (click)="open(t)">
                <ion-icon slot="icon-only" name="create-outline" />
              </ion-button>
              <ion-button slot="end" fill="clear" color="danger" aria-label="Obriši" (click)="remove(t)">
                <ion-icon slot="icon-only" name="trash-outline" />
              </ion-button>
            </ion-item>
          }
        </ion-list>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button aria-label="Nova vrsta stola" (click)="open()"><ion-icon name="add" /></ion-fab-button>
      </ion-fab>

      <ion-modal [isOpen]="modalOpen()" (didDismiss)="modalOpen.set(false)">
        <ng-template>
          <ion-header>
            <ion-toolbar>
              <ion-title>{{ editingId() ? 'Izmena' : 'Nova vrsta stola' }}</ion-title>
              <ion-buttons slot="end"><ion-button (click)="modalOpen.set(false)">Zatvori</ion-button></ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <form [formGroup]="form" (ngSubmit)="submit()" class="form">
              <ion-input label="Naziv" labelPlacement="floating" fill="outline" formControlName="name" />
              <ion-input label="Dužina termina (min)" labelPlacement="floating" fill="outline" type="number" inputmode="numeric" formControlName="slotMinutes" />
              <ion-input label="Minimalno trajanje (min)" labelPlacement="floating" fill="outline" type="number" inputmode="numeric" formControlName="minDurationMinutes" />
              <ion-input label="Maksimalno trajanje (min)" labelPlacement="floating" fill="outline" type="number" inputmode="numeric" formControlName="maxDurationMinutes" />
              <ion-input label="Koliko dana unapred" labelPlacement="floating" fill="outline" type="number" inputmode="numeric" formControlName="maxDaysInAdvance" />
              <ion-input label="Rok za otkazivanje (sati)" labelPlacement="floating" fill="outline" type="number" inputmode="numeric" formControlName="cancellationDeadlineHours" />
              <ion-input label="Cena po satu (RSD)" labelPlacement="floating" fill="outline" type="number" inputmode="decimal" formControlName="pricePerHour" />
              <ion-button type="submit" expand="block" [disabled]="form.invalid || saving()">
                @if (saving()) { <ion-spinner name="dots" /> } @else { Sačuvaj }
              </ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
})
export class AdminTypesPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly alerts = inject(AlertController);

  protected readonly items = signal<ResourceType[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly modalOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    slotMinutes: [30, [Validators.required, Validators.min(5), Validators.max(240)]],
    minDurationMinutes: [60, [Validators.required, Validators.min(5)]],
    maxDurationMinutes: [180, [Validators.required, Validators.min(5)]],
    maxDaysInAdvance: [30, [Validators.required, Validators.min(1), Validators.max(365)]],
    cancellationDeadlineHours: [2, [Validators.required, Validators.min(0), Validators.max(720)]],
    pricePerHour: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    addIcons({ add, createOutline, trashOutline });
  }

  ionViewWillEnter(): void {
    this.load();
  }

  protected dur(minutes: number): string {
    return formatDuration(minutes);
  }

  protected price(amount: number): string {
    return formatPrice(amount);
  }

  protected open(type?: ResourceType): void {
    this.editingId.set(type?.id ?? null);
    this.form.reset(
      type
        ? {
            name: type.name,
            slotMinutes: type.slotMinutes,
            minDurationMinutes: type.minDurationMinutes,
            maxDurationMinutes: type.maxDurationMinutes,
            maxDaysInAdvance: type.maxDaysInAdvance,
            cancellationDeadlineHours: type.cancellationDeadlineHours,
            pricePerHour: type.pricePerHour,
          }
        : DEFAULTS,
    );
    this.modalOpen.set(true);
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) return;

    const v = this.form.getRawValue();
    const request = {
      name: v.name.trim(),
      slotMinutes: Number(v.slotMinutes),
      minDurationMinutes: Number(v.minDurationMinutes),
      maxDurationMinutes: Number(v.maxDurationMinutes),
      maxDaysInAdvance: Number(v.maxDaysInAdvance),
      cancellationDeadlineHours: Number(v.cancellationDeadlineHours),
      pricePerHour: Number(v.pricePerHour),
    };

    const id = this.editingId();
    const call = id ? this.api.updateType(id, request) : this.api.createType(request);

    this.saving.set(true);
    call.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.modalOpen.set(false);
        void this.toast.success('Sačuvano.');
        this.load();
      },
      error: (e) => void this.toast.error(apiErrorMessage(e)),
    });
  }

  protected async remove(t: ResourceType): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Obriši vrstu stola?',
      message: t.name,
      buttons: [
        { text: 'Ne', role: 'cancel' },
        {
          text: 'Obriši',
          role: 'destructive',
          handler: () =>
            this.api.deleteType(t.id).subscribe({
              next: () => {
                void this.toast.success('Obrisano.');
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
      .listTypes()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.items.set(items),
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }
}