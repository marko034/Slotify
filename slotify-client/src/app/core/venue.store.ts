import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Venue } from './models';

@Injectable({ providedIn: 'root' })
export class VenueStore {
  private readonly http = inject(HttpClient);
  private readonly _venue = signal<Venue | null>(null);

  readonly venue = this._venue.asReadonly();
  readonly timeZone = computed(() => this._venue()?.timeZoneId ?? 'Europe/Belgrade');

  async ensureLoaded(): Promise<Venue | null> {
    const current = this._venue();
    if (current) return current;
    try {
      const venue = await firstValueFrom(this.http.get<Venue>(`${environment.apiUrl}/venue`));
      this._venue.set(venue);
      return venue;
    } catch {
      return null;
    }
  }

  clear(): void {
    this._venue.set(null);
  }

  update(venue: Venue): void {
  this._venue.set(venue);
}
}