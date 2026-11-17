import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController,
  IonBadge,
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
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add,
  chevronBack,
  chevronForward,
  closeCircleOutline,
  personRemoveOutline,
} from 'ionicons/icons';
import { finalize } from 'rxjs';
import { AdminApi } from '../../api/admin.api';
import { BookingsApi } from '../../api/bookings.api';
import { StaffApi } from '../../api/staff.api';
import { apiErrorMessage } from '../../core/api-error';
import { Resource, StaffBooking } from '../../core/models';
import { addDays, formatDateOnly, formatTime, todayInZone, zonedToUtcIso } from '../../core/time';
import { ToastService } from '../../core/toast.service';
import { VenueStore } from '../../core/venue.store';
import { VenueTimePipe } from '../../core/venue-time.pipe';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    VenueTimePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonButton,
    IonIcon,
    IonInput,
    IonToggle,
    IonSpinner,
    IonText,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonFab,
    IonFabButton,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonTextarea,
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Kalendar</ion-title></ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="page ion-padding">
        <div class="nav">
          <ion-button fill="clear" aria-label="Prethodni dan" (click)="shift(-1)">
            <ion-icon slot="icon-only" name="chevron-back" />
          </ion-button>
          <strong class="day">{{ label() }}</strong>
          <ion-button fill="clear" aria-label="Sledeći dan" (click)="shift(1)">
            <ion-icon slot="icon-only" name="chevron-forward" />
          </ion-button>
        </div>

        <div class="controls">
          <ion-button size="small" fill="outline" (click)="goToday()">Danas</ion-button>
          <ion-input
            type="date"
            aria-label="Datum"
            fill="outline"
            [value]="date()"
            (ionChange)="onDateInput($event.detail.value)"
          />
        </div>

        <ion-toggle
          [checked]="includeCancelled()"
          (ionChange)="onToggleCancelled($event.detail.checked)"
        >
          Prikaži otkazane
        </ion-toggle>

        @if (loading() && !loaded()) {
          <div class="center"><ion-spinner /></div>
        } @else if (groups().length === 0) {
          <ion-text color="medium"><p>Nema rezervacija za ovaj dan.</p></ion-text>
        }

        @for (g of groups(); track g.name) {
          <h3>{{ g.name }}</h3>
          <ion-list>
            @for (b of g.items; track b.id) {
              <ion-item [class.cancelled]="b.status === 'Cancelled'">
                <ion-label class="ion-text-wrap">
                  <h2>{{ b.start | venueTime }} – {{ b.end | venueTime }}</h2>
                  <p>{{ title(b) }}</p>
                  @if (b.guestPhone) { <p>{{ b.guestPhone }}</p> }
                  @if (b.notes) { <p><em>{{ b.notes }}</em></p> }
                </ion-label>

                @if (b.kind === 'Block') {
                  <ion-badge slot="end" color="tertiary">Blokada</ion-badge>
                }
                @if (b.status === 'Cancelled') {
                  <ion-badge slot="end" color="medium">Otkazano</ion-badge>
                } @else if (b.status === 'NoShow') {
                  <ion-badge slot="end" color="warning">Nije došao</ion-badge>
                }

                @if (canNoShow(b)) {
                  <ion-button slot="end" fill="clear" color="warning" aria-label="Označi da nije došao" (click)="noShow(b)">
                    <ion-icon slot="icon-only" name="person-remove-outline" />
                  </ion-button>
                }
                @if (canCancel(b)) {
                  <ion-button slot="end" fill="clear" color="danger" aria-label="Otkaži" (click)="cancel(b)">
                    <ion-icon slot="icon-only" name="close-circle-outline" />
                  </ion-button>
                }
              </ion-item>
            }
          </ion-list>
        }
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button aria-label="Nova blokada" (click)="openBlock()">
          <ion-icon name="add" />
        </ion-fab-button>
      </ion-fab>

      <ion-modal [isOpen]="blockOpen()" (didDismiss)="blockOpen.set(false)">
        <ng-template>
          <ion-header>
            <ion-toolbar>
              <ion-title>Nova blokada</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="blockOpen.set(false)">Zatvori</ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <form [formGroup]="blockForm" (ngSubmit)="submitBlock()" class="form">
              <ion-select label="Sto" labelPlacement="floating" fill="outline" formControlName="resourceId">
                <ion-select-option value="all">Svi stolovi</ion-select-option>
                @for (r of resources(); track r.id) {
                  <ion-select-option [value]="r.id">{{ r.name }}</ion-select-option>
                }
              </ion-select>
              <ion-input type="date" label="Datum" labelPlacement="stacked" fill="outline" formControlName="date" />
              <ion-input type="time" label="Od" labelPlacement="stacked" fill="outline" formControlName="start" />
              <ion-input type="time" label="Do" labelPlacement="stacked" fill="outline" formControlName="end" />
              <ion-textarea
                label="Razlog (npr. Turnir)"
                labelPlacement="floating"
                fill="outline"
                maxlength="500"
                formControlName="notes"
              />
              <ion-button type="submit" expand="block" [disabled]="blockForm.invalid || saving()">
                @if (saving()) { <ion-spinner name="dots" /> } @else { Blokiraj termin }
              </ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: [
    `
      .nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .day {
        text-transform: capitalize;
        text-align: center;
      }
      .controls {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .controls ion-input {
        flex: 1;
      }
      .center {
        display: flex;
        justify-content: center;
        padding: 16px;
      }
      h3 {
        margin: 16px 0 4px;
      }
      .cancelled {
        opacity: 0.55;
      }
    `,
  ],
})
export class CalendarPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly staffApi = inject(StaffApi);
  private readonly bookingsApi = inject(BookingsApi);
  private readonly adminApi = inject(AdminApi);
  private readonly venue = inject(VenueStore);
  private readonly toast = inject(ToastService);
  private readonly alerts = inject(AlertController);

  protected readonly date = signal(todayInZone(this.venue.timeZone()));
  protected readonly includeCancelled = signal(false);
  protected readonly items = signal<StaffBooking[]>([]);
  protected readonly resources = signal<Resource[]>([]);
  protected readonly loading = signal(false);
  protected readonly loaded = signal(false);
  protected readonly blockOpen = signal(false);
  protected readonly saving = signal(false);

  protected readonly label = computed(() => formatDateOnly(this.date()));

  protected readonly groups = computed(() => {
    const map = new Map<string, StaffBooking[]>();
    for (const b of this.items()) {
      const list = map.get(b.resourceName) ?? [];
      list.push(b);
      map.set(b.resourceName, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'sr', { numeric: true }))
      .map(([name, items]) => ({ name, items }));
  });

  protected readonly blockForm = this.fb.nonNullable.group({
    resourceId: ['all', Validators.required],
    date: ['', Validators.required],
    start: ['', Validators.required],
    end: ['', Validators.required],
    notes: [''],
  });

  constructor() {
    addIcons({ add, chevronBack, chevronForward, closeCircleOutline, personRemoveOutline });

    // Preusmerenje iz rezervacije za gosta: /calendar?date=2026-11-14
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const d = params.get('date');
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) this.date.set(d);
    });
  }

  ionViewWillEnter(): void {
    this.load();
    this.adminApi.listResources().subscribe({
      next: (r) => this.resources.set(r.filter((x) => x.isActive)),
      error: () => {},
    });
  }

  protected refresh(event: Event): void {
    this.load(() => (event.target as HTMLIonRefresherElement).complete());
  }

  protected shift(days: number): void {
    this.date.set(addDays(this.date(), days));
    this.load();
  }

  protected goToday(): void {
    this.date.set(todayInZone(this.venue.timeZone()));
    this.load();
  }

  protected onDateInput(value: unknown): void {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value === this.date()) return;
    this.date.set(value);
    this.load();
  }

  protected onToggleCancelled(checked: boolean): void {
    this.includeCancelled.set(checked);
    this.load();
  }

  protected title(b: StaffBooking): string {
    if (b.kind === 'Block') return b.notes ?? 'Zatvoreno';
    if (b.guestName) return `${b.guestName} (gost)`;
    return b.displayName ?? 'Nepoznat korisnik';
  }

  protected canCancel(b: StaffBooking): boolean {
    return b.status === 'Confirmed' && Date.parse(b.end) > Date.now();
  }

  protected canNoShow(b: StaffBooking): boolean {
    return b.kind === 'Reservation' && b.status === 'Confirmed' && Date.parse(b.start) <= Date.now();
  }

  protected async cancel(b: StaffBooking): Promise<void> {
    const tz = this.venue.timeZone();
    const what = b.kind === 'Block' ? 'blokadu' : 'rezervaciju';
    const alert = await this.alerts.create({
      header: `Otkaži ${what}?`,
      message: `${b.resourceName}, ${formatTime(b.start, tz)} – ${formatTime(b.end, tz)}`,
      buttons: [
        { text: 'Ne', role: 'cancel' },
        { text: 'Otkaži', role: 'destructive', handler: () => this.doCancel(b) },
      ],
    });
    await alert.present();
  }

  protected async noShow(b: StaffBooking): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Gost se nije pojavio?',
      message: this.title(b),
      buttons: [
        { text: 'Ne', role: 'cancel' },
        { text: 'Potvrdi', handler: () => this.doNoShow(b) },
      ],
    });
    await alert.present();
  }

  protected openBlock(): void {
    this.blockForm.reset({
      resourceId: 'all',
      date: this.date(),
      start: '',
      end: '',
      notes: '',
    });
    this.blockOpen.set(true);
  }

  protected submitBlock(): void {
    if (this.blockForm.invalid || this.saving()) return;

    const v = this.blockForm.getRawValue();
    if (v.end <= v.start) {
      void this.toast.error('Vreme završetka mora biti posle početka.');
      return;
    }

    const tz = this.venue.timeZone();
    this.saving.set(true);

    this.staffApi
      .createBlock({
        resourceId: v.resourceId === 'all' ? null : v.resourceId,
        start: zonedToUtcIso(v.date, v.start, tz),
        end: zonedToUtcIso(v.date, v.end, tz),
        notes: v.notes.trim() || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.blockOpen.set(false);
          void this.toast.success('Termin je blokiran.');
          this.date.set(v.date);
          this.load();
        },
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }

  private doCancel(b: StaffBooking): void {
    this.bookingsApi.cancel(b.id).subscribe({
      next: () => {
        void this.toast.success('Otkazano.');
        this.load();
      },
      error: (e) => void this.toast.error(apiErrorMessage(e)),
    });
  }

  private doNoShow(b: StaffBooking): void {
    this.staffApi.markNoShow(b.id).subscribe({
      next: () => {
        void this.toast.success('Označeno kao propušteno.');
        this.load();
      },
      error: (e) => void this.toast.error(apiErrorMessage(e)),
    });
  }

  private load(done?: () => void): void {
    this.loading.set(true);
    this.staffApi
      .listDay(this.date(), this.includeCancelled())
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loaded.set(true);
          done?.();
        }),
      )
      .subscribe({
        next: (items) => this.items.set(items),
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }
}