import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Availability } from '../core/models';

@Injectable({ providedIn: 'root' })
export class AvailabilityApi {
  private readonly http = inject(HttpClient);

  get(date: string, resourceTypeId: string) {
    return this.http.get<Availability>(`${environment.apiUrl}/availability`, {
      params: { date, resourceTypeId },
    });
  }
}