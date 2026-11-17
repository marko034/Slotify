import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { ResourceType } from '../core/models';

@Injectable({ providedIn: 'root' })
export class ResourceTypesApi {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<ResourceType[]>(`${environment.apiUrl}/resource-types`);
  }
}