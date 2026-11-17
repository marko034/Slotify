import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { finalize } from 'rxjs';
import { AdminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../core/api-error';
import { ToastService } from '../../core/toast.service';
import { VenueStore } from '../../core/venue.store';

@Component({
  selector: 'app-admin-venue',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInput,
    IonNote,
    IonButton,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/admin" /></ion-buttons>
        <ion-title>Podaci o sali</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <form [formGroup]="form" (ngSubmit)="save()" class="page form">
        @if (loading()) { <ion-spinner /> }
        <ion-input label="Naziv sale" labelPlacement="floating" fill="outline" formControlName="name" />
        <ion-input label="Adresa" labelPlacement="floating" fill="outline" formControlName="address" />
        <ion-input label="Vremenska zona" labelPlacement="floating" fill="outline" formControlName="timeZoneId" />
        <ion-note>Svi termini se računaju u ovoj zoni, npr. Europe/Belgrade.</ion-note>
        <ion-button type="submit" expand="block" [disabled]="form.invalid || saving() || loading()">
          @if (saving()) { <ion-spinner name="dots" /> } @else { Sačuvaj }
        </ion-button>
      </form>
    </ion-content>
  `,
})
export class AdminVenuePage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminApi);
  private readonly store = inject(VenueStore);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    address: ['', Validators.maxLength(300)],
    timeZoneId: ['', Validators.required],
  });

  ionViewWillEnter(): void {
    this.loading.set(true);
    this.api
      .getVenue()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (v) =>
          this.form.setValue({ name: v.name, address: v.address ?? '', timeZoneId: v.timeZoneId }),
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) return;

    const v = this.form.getRawValue();
    this.saving.set(true);

    this.api
      .updateVenue({ name: v.name.trim(), address: v.address.trim() || null, timeZoneId: v.timeZoneId.trim() })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (venue) => {
          this.store.update(venue);
          void this.toast.success('Sačuvano.');
        },
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }
}