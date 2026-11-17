import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Booking, CreateBookingRequest } from '../core/models';

@Injectable({ providedIn: 'root' })
export class BookingsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/bookings`;

  create(request: CreateBookingRequest) {
    return this.http.post<Booking>(this.base, request);
  }

  listMine(includePast: boolean) {
    return this.http.get<Booking[]>(`${this.base}/my`, {
      params: { includePast },
    });
  }

  cancel(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}