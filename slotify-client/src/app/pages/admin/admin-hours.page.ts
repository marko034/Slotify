import { Component, inject, signal } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonSpinner,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { finalize } from 'rxjs';
import { AdminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../core/api-error';
import { DayName } from '../../core/models';
import { DAYS, fromApiTime, toApiTime } from '../../core/time';
import { ToastService } from '../../core/toast.service';

interface Row {
  key: DayName;
  label: string;
  open: boolean;
  openTime: string;
  closeTime: string;
}

@Component({
  selector: 'app-admin-hours',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonToggle,
    IonInput,
    IonButton,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/admin" /></ion-buttons>
        <ion-title>Radno vreme</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page">
        @if (loading()) {
          <div class="ion-padding"><ion-spinner /></div>
        }
        <ion-list>
          @for (r of rows(); track r.key; let i = $index) {
            <ion-item>
              <ion-toggle [checked]="r.open" (ionChange)="patch(i, { open: $event.detail.checked })">
                {{ r.label }}
              </ion-toggle>
            </ion-item>
            @if (r.open) {
              <ion-item lines="full">
                <ion-input
                  type="time"
                  label="Od"
                  [value]="r.openTime"
                  (ionInput)="setTime(i, 'openTime', $event.detail.value)"
                />
                <ion-input
                  type="time"
                  label="Do"
                  [value]="r.closeTime"
                  (ionInput)="setTime(i, 'closeTime', $event.detail.value)"
                />
              </ion-item>
            }
          }
        </ion-list>

        <div class="ion-padding form">
          <ion-button fill="outline" expand="block" (click)="copyToAll()">
            Isto vreme za sve radne dane
          </ion-button>
          <ion-button expand="block" [disabled]="saving() || loading()" (click)="save()">
            @if (saving()) { <ion-spinner name="dots" /> } @else { Sačuvaj }
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
})
export class AdminHoursPage {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);

  protected readonly rows = signal<Row[]>(
    DAYS.map((d) => ({ key: d.key, label: d.label, open: false, openTime: '09:00', closeTime: '22:00' })),
  );
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  ionViewWillEnter(): void {
    this.loading.set(true);
    this.api
      .getHours()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (hours) =>
          this.rows.set(
            DAYS.map((d) => {
              const h = hours.find((x) => x.dayOfWeek === d.key);
              return {
                key: d.key,
                label: d.label,
                open: !!h,
                openTime: h ? fromApiTime(h.openTime) : '09:00',
                closeTime: h ? fromApiTime(h.closeTime) : '22:00',
              };
            }),
          ),
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }

  protected patch(index: number, change: Partial<Row>): void {
    this.rows.update((rows) => rows.map((r, i) => (i === index ? { ...r, ...change } : r)));
  }

  protected setTime(index: number, key: 'openTime' | 'closeTime', value: unknown): void {
    if (typeof value === 'string' && value) this.patch(index, { [key]: value });
  }

  protected copyToAll(): void {
    const first = this.rows().find((r) => r.open);
    if (!first) {
      void this.toast.error('Prvo uključi bar jedan dan.');
      return;
    }
    this.rows.update((rows) =>
      rows.map((r) => (r.open ? { ...r, openTime: first.openTime, closeTime: first.closeTime } : r)),
    );
  }

  protected save(): void {
    const open = this.rows().filter((r) => r.open);

    const invalid = open.find((r) => r.closeTime <= r.openTime);
    if (invalid) {
      void this.toast.error(`${invalid.label}: vreme zatvaranja mora biti posle otvaranja.`);
      return;
    }

    this.saving.set(true);
    this.api
      .setHours(
        open.map((r) => ({
          dayOfWeek: r.key,
          openTime: toApiTime(r.openTime),
          closeTime: toApiTime(r.closeTime),
        })),
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => void this.toast.success('Radno vreme je sačuvano.'),
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }
}