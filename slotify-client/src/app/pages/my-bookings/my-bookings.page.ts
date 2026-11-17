import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { finalize } from 'rxjs';
import { BookingsApi } from '../../api/bookings.api';
import { apiErrorMessage } from '../../core/api-error';
import { Booking, BookingStatus } from '../../core/models';
import { formatDate, formatTime } from '../../core/time';
import { ToastService } from '../../core/toast.service';
import { VenueStore } from '../../core/venue.store';
import { VenueTimePipe } from '../../core/venue-time.pipe';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [
    VenueTimePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonList,
    IonItem,
    IonBadge,
    IonButton,
    IonSpinner,
    IonText,
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Moji termini</ion-title></ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page">
        <ion-segment [value]="mode()" (ionChange)="onModeChange($event.detail.value)">
          <ion-segment-button value="upcoming"><ion-label>Predstojeći</ion-label></ion-segment-button>
          <ion-segment-button value="all"><ion-label>Svi</ion-label></ion-segment-button>
        </ion-segment>

        @if (loading() && !loaded()) {
          <div class="center"><ion-spinner /></div>
        } @else if (items().length === 0) {
          <div class="empty">
            <ion-text color="medium">
              <p>{{ mode() === 'upcoming' ? 'Nemaš predstojećih rezervacija.' : 'Još nemaš rezervacija.' }}</p>
            </ion-text>
            <ion-button (click)="goBook()">Rezerviši termin</ion-button>
          </div>
        } @else {
          <ion-list>
            @for (b of items(); track b.id) {
              <ion-item>
                <ion-label>
                  <h2>{{ b.resourceName }}</h2>
                  <p>{{ b.start | venueTime: 'date' }}</p>
                  <p>{{ b.start | venueTime }} – {{ b.end | venueTime }}</p>
                </ion-label>
                <ion-badge slot="end" [color]="statusColor(b.status)">{{ statusLabel(b.status) }}</ion-badge>
                @if (canCancel(b)) {
                  <ion-button slot="end" fill="clear" color="danger" (click)="cancel(b)">Otkaži</ion-button>
                }
              </ion-item>
            }
          </ion-list>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .page {
        max-width: 640px;
        margin: 0 auto;
        padding: 8px;
      }
      .center,
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px;
      }
    `,
  ],
})
export class MyBookingsPage {
  private readonly api = inject(BookingsApi);
  private readonly venue = inject(VenueStore);
  private readonly toast = inject(ToastService);
  private readonly alerts = inject(AlertController);
  private readonly router = inject(Router);

  protected readonly mode = signal<'upcoming' | 'all'>('upcoming');
  protected readonly rawItems = signal<Booking[]>([]);
  protected readonly loading = signal(false);
  protected readonly loaded = signal(false);

  // Za istoriju je korisnije da najnovije bude na vrhu
  protected readonly items = computed(() =>
    this.mode() === 'all' ? [...this.rawItems()].reverse() : this.rawItems(),
  );

  ionViewWillEnter(): void {
    this.load();
  }

  protected onModeChange(value: unknown): void {
    this.mode.set(value === 'all' ? 'all' : 'upcoming');
    this.load();
  }

  protected goBook(): void {
    void this.router.navigateByUrl('/book');
  }

  protected canCancel(b: Booking): boolean {
    return b.kind === 'Reservation' && b.status === 'Confirmed' && Date.parse(b.start) > Date.now();
  }

  protected statusLabel(status: BookingStatus): string {
    return { Confirmed: 'Potvrđeno', Cancelled: 'Otkazano', NoShow: 'Nije došao' }[status];
  }

  protected statusColor(status: BookingStatus): string {
    return { Confirmed: 'success', Cancelled: 'medium', NoShow: 'warning' }[status];
  }

  protected async cancel(b: Booking): Promise<void> {
    const tz = this.venue.timeZone();
    const alert = await this.alerts.create({
      header: 'Otkaži rezervaciju?',
      message: `${b.resourceName}, ${formatDate(b.start, tz)}, ${formatTime(b.start, tz)}`,
      buttons: [
        { text: 'Ne', role: 'cancel' },
        { text: 'Otkaži termin', role: 'destructive', handler: () => this.doCancel(b) },
      ],
    });
    await alert.present();
  }

  private doCancel(b: Booking): void {
    this.api.cancel(b.id).subscribe({
      next: () => {
        void this.toast.success('Rezervacija je otkazana.');
        this.load();
      },
      error: (e) => void this.toast.error(apiErrorMessage(e)),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api
      .listMine(this.mode() === 'all')
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loaded.set(true);
        }),
      )
      .subscribe({
        next: (items) => this.rawItems.set(items),
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }
}