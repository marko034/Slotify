import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  IonButton,
  IonChip,
  IonContent,
  IonDatetime,
  IonHeader,
  IonInput,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { finalize } from 'rxjs';
import { AvailabilityApi } from '../../api/availability.api';
import { BookingsApi } from '../../api/bookings.api';
import { ResourceTypesApi } from '../../api/resource-types.api';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import {
  Availability,
  AvailabilityStart,
  ResourceAvailability,
  ResourceType,
} from '../../core/models';
import { addDays, formatDateOnly, formatDuration, formatPrice, todayInZone } from '../../core/time';
import { ToastService } from '../../core/toast.service';
import { VenueStore } from '../../core/venue.store';
import { VenueTimePipe } from '../../core/venue-time.pipe';

interface Selection {
  resourceId: string;
  resourceName: string;
  start: string;
  maxDuration: number;
}

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [
    FormsModule,
    VenueTimePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSelect,
    IonSelectOption,
    IonDatetime,
    IonChip,
    IonButton,
    IonSpinner,
    IonText,
    IonNote,
    IonInput,
    IonTextarea,
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Rezervacija</ion-title></ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="page">
        @if (typesLoading()) {
          <div class="center"><ion-spinner /></div>
        } @else if (types().length === 0) {
          <ion-text color="medium"><p>Sala još nema podešene stolove.</p></ion-text>
        } @else {
          @if (types().length > 1) {
            <ion-select
              label="Vrsta stola"
              labelPlacement="floating"
              fill="outline"
              [value]="typeId()"
              (ionChange)="onTypeChange($event.detail.value)"
            >
              @for (t of types(); track t.id) {
                <ion-select-option [value]="t.id">{{ t.name }}</ion-select-option>
              }
            </ion-select>
          }

          <ion-datetime
            presentation="date"
            [value]="date()"
            [min]="today()"
            [max]="maxDate()"
            [firstDayOfWeek]="1"
            (ionChange)="onDateChange($event.detail.value)"
          />

          <h3 class="day">{{ dateLabel() }}</h3>

          @if (loading()) {
            <div class="center"><ion-spinner name="dots" /></div>
          } @else if (availability(); as a) {
            @if (a.resources.length === 0) {
              <ion-text color="medium"><p>Nema aktivnih stolova.</p></ion-text>
            } @else if (!hasAnyStart()) {
              <ion-text color="medium"><p>Nema slobodnih termina za izabrani dan.</p></ion-text>
            }

            @for (r of a.resources; track r.resourceId) {
              <section>
                <h4>{{ r.resourceName }}</h4>
                @if (r.starts.length === 0) {
                  <ion-note>Nema slobodnih termina</ion-note>
                }
                <div class="chips">
                  @for (s of r.starts; track s.start) {
                    <ion-chip
                      [outline]="!isSelected(r, s)"
                      [color]="isSelected(r, s) ? 'primary' : undefined"
                      (click)="select(r, s)"
                    >
                      {{ s.start | venueTime }}
                    </ion-chip>
                  }
                </div>
              </section>
            }
          }

          @if (selection(); as sel) {
            <section class="summary">
              <h3>{{ sel.resourceName }}</h3>
              <p>{{ sel.start | venueTime: 'datetime' }} – {{ endIso() | venueTime }}</p>

              <ion-select
                label="Trajanje"
                labelPlacement="floating"
                fill="outline"
                [value]="duration()"
                (ionChange)="duration.set($event.detail.value)"
              >
                @for (d of durations(); track d) {
                  <ion-select-option [value]="d">{{ fmtDuration(d) }}</ion-select-option>
                }
              </ion-select>

              @if (price() > 0) {
                <p>Cena: <strong>{{ fmtPrice(price()) }}</strong></p>
              }

              @if (auth.isStaff()) {
                <ion-input
                  label="Ime gosta (telefonska rezervacija)"
                  labelPlacement="floating"
                  fill="outline"
                  [(ngModel)]="guestName"
                />
                <ion-input
                  label="Telefon gosta"
                  labelPlacement="floating"
                  fill="outline"
                  type="tel"
                  [(ngModel)]="guestPhone"
                />
              }

              <ion-textarea
                label="Napomena (opciono)"
                labelPlacement="floating"
                fill="outline"
                maxlength="500"
                [(ngModel)]="notes"
              />

              <ion-button expand="block" [disabled]="submitting()" (click)="submit()">
                @if (submitting()) { <ion-spinner name="dots" /> } @else { Potvrdi rezervaciju }
              </ion-button>
            </section>
          }
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .page {
        max-width: 560px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .center {
        display: flex;
        justify-content: center;
        padding: 16px;
      }
      .day {
        margin: 8px 0 0;
        text-transform: capitalize;
      }
      h4 {
        margin: 12px 0 4px;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
      }
      .summary {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 16px;
        padding-top: 8px;
        border-top: 1px solid var(--ion-color-step-150, #d7d8da);
      }
    `,
  ],
})
export class BookPage {
  private readonly typesApi = inject(ResourceTypesApi);
  private readonly availabilityApi = inject(AvailabilityApi);
  private readonly bookingsApi = inject(BookingsApi);
  private readonly venue = inject(VenueStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  private readonly content = viewChild(IonContent);
  private requestId = 0; // ignoriše zakasnele odgovore kad korisnik brzo menja datum

  protected readonly types = signal<ResourceType[]>([]);
  protected readonly typesLoading = signal(true);
  protected readonly typeId = signal<string | null>(null);
  protected readonly today = signal(todayInZone(this.venue.timeZone()));
  protected readonly date = signal(this.today());
  protected readonly availability = signal<Availability | null>(null);
  protected readonly loading = signal(false);
  protected readonly selection = signal<Selection | null>(null);
  protected readonly duration = signal<number | null>(null);
  protected readonly submitting = signal(false);

  protected notes = '';
  protected guestName = '';
  protected guestPhone = '';

  protected readonly currentType = computed(
    () => this.types().find((t) => t.id === this.typeId()) ?? null,
  );
  protected readonly maxDate = computed(() =>
    addDays(this.today(), this.currentType()?.maxDaysInAdvance ?? 30),
  );
  protected readonly dateLabel = computed(() => formatDateOnly(this.date()));
  protected readonly hasAnyStart = computed(
    () => this.availability()?.resources.some((r) => r.starts.length > 0) ?? false,
  );

  protected readonly durations = computed(() => {
    const a = this.availability();
    const sel = this.selection();
    if (!a || !sel) return [];

    const max = Math.min(sel.maxDuration, a.maxDurationMinutes);
    const list: number[] = [];
    for (let d = a.minDurationMinutes; d <= max; d += a.slotMinutes) list.push(d);
    return list;
  });

  protected readonly endIso = computed(() => {
    const sel = this.selection();
    const d = this.duration();
    return sel && d ? new Date(Date.parse(sel.start) + d * 60_000).toISOString() : null;
  });

  protected readonly price = computed(() => {
    const t = this.currentType();
    const d = this.duration();
    return t && d ? (t.pricePerHour * d) / 60 : 0;
  });

  // Ionic poziva ovu metodu svaki put kad se tab otvori (stranice u tabovima se keširaju)
  ionViewWillEnter(): void {
    this.today.set(todayInZone(this.venue.timeZone()));
    if (this.date() < this.today()) this.date.set(this.today());

    this.typesApi
      .list()
      .pipe(finalize(() => this.typesLoading.set(false)))
      .subscribe({
        next: (types) => {
          this.types.set(types);
          if (!types.some((t) => t.id === this.typeId())) {
            this.typeId.set(types[0]?.id ?? null);
          }
          this.loadAvailability();
        },
        error: (e) => this.toast.error(apiErrorMessage(e)),
      });
  }

  protected onTypeChange(id: string): void {
    if (id === this.typeId()) return;
    this.typeId.set(id);
    this.loadAvailability();
  }

  protected onDateChange(value: string | string[] | null | undefined): void {
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw) return;

    const day = raw.slice(0, 10);
    if (day === this.date()) return;
    this.date.set(day);
    this.loadAvailability();
  }

  protected isSelected(r: ResourceAvailability, s: AvailabilityStart): boolean {
    const sel = this.selection();
    return sel !== null && sel.resourceId === r.resourceId && sel.start === s.start;
  }

  protected select(r: ResourceAvailability, s: AvailabilityStart): void {
    this.selection.set({
      resourceId: r.resourceId,
      resourceName: r.resourceName,
      start: s.start,
      maxDuration: s.maxDurationMinutes,
    });
    this.duration.set(this.availability()?.minDurationMinutes ?? null);
    setTimeout(() => void this.content()?.scrollToBottom(300), 50);
  }

  protected fmtDuration(minutes: number): string {
    return formatDuration(minutes);
  }

  protected fmtPrice(amount: number): string {
    return formatPrice(amount);
  }

  protected submit(): void {
    const sel = this.selection();
    const minutes = this.duration();
    if (!sel || !minutes || this.submitting()) return;

    const staff = this.auth.isStaff();
    const guestName = staff ? this.guestName.trim() : '';
    const guestPhone = staff ? this.guestPhone.trim() : '';

    if (guestPhone && !guestName) {
      void this.toast.error('Unesi ime gosta.');
      return;
    }

    const forGuest = guestName.length > 0;
    this.submitting.set(true);

    this.bookingsApi
      .create({
        resourceId: sel.resourceId,
        start: sel.start,
        durationMinutes: minutes,
        notes: this.notes.trim() || null,
        guestName: guestName || null,
        guestPhone: guestPhone || null,
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          void this.toast.success('Rezervacija je potvrđena.');
          this.notes = '';
          this.guestName = '';
          this.guestPhone = '';
          if (forGuest) {
            this.selection.set(null);
            void this.router.navigate(['/calendar'], { queryParams: { date: this.date() } });
          } else {
            this.selection.set(null);
            void this.router.navigateByUrl('/my-bookings');
          }
        },
        error: (e) => {
          void this.toast.error(
            e instanceof HttpErrorResponse && e.status === 409
              ? 'Termin je upravo zauzet. Izaberi drugi.'
              : apiErrorMessage(e),
          );
          this.loadAvailability(); // osveži da se vidi trenutno stanje
        },
      });
  }

  private loadAvailability(): void {
    const typeId = this.typeId();
    if (!typeId) return;

    if (this.date() > this.maxDate()) this.date.set(this.maxDate());

    const id = ++this.requestId;
    this.loading.set(true);
    this.selection.set(null);

    this.availabilityApi
      .get(this.date(), typeId)
      .pipe(
        finalize(() => {
          if (id === this.requestId) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (a) => {
          if (id === this.requestId) this.availability.set(a);
        },
        error: (e) => {
          if (id !== this.requestId) return;
          this.availability.set(null);
          void this.toast.error(apiErrorMessage(e));
        },
      });
  }
}