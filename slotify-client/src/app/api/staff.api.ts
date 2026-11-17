import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { CreateBlockRequest, StaffBooking } from '../core/models';

@Injectable({ providedIn: 'root' })
export class StaffApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/staff`;

  listDay(date: string, includeCancelled: boolean) {
    return this.http.get<StaffBooking[]>(`${this.base}/bookings`, {
      params: { date, includeCancelled },
    });
  }

  createBlock(request: CreateBlockRequest) {
    return this.http.post<StaffBooking[]>(`${this.base}/blocks`, request);
  }

  markNoShow(id: string) {
    return this.http.post<void>(`${this.base}/bookings/${id}/no-show`, {});
  }
}