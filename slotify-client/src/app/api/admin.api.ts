import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  OpeningHours,
  Resource,
  ResourceRequest,
  ResourceType,
  ResourceTypeRequest,
  StaffMember,
  Venue,
} from '../core/models';

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getVenue() {
    return this.http.get<Venue>(`${this.base}/venue`);
  }
  updateVenue(venue: Venue) {
    return this.http.put<Venue>(`${this.base}/venue`, venue);
  }

  listTypes() {
    return this.http.get<ResourceType[]>(`${this.base}/resource-types`);
  }
  createType(request: ResourceTypeRequest) {
    return this.http.post<ResourceType>(`${this.base}/resource-types`, request);
  }
  updateType(id: string, request: ResourceTypeRequest) {
    return this.http.put<ResourceType>(`${this.base}/resource-types/${id}`, request);
  }
  deleteType(id: string) {
    return this.http.delete<void>(`${this.base}/resource-types/${id}`);
  }

  listResources() {
    return this.http.get<Resource[]>(`${this.base}/resources`);
  }
  createResource(request: ResourceRequest) {
    return this.http.post<Resource>(`${this.base}/resources`, request);
  }
  updateResource(id: string, request: ResourceRequest) {
    return this.http.put<Resource>(`${this.base}/resources/${id}`, request);
  }
  deleteResource(id: string) {
    return this.http.delete<void>(`${this.base}/resources/${id}`);
  }

  getHours() {
    return this.http.get<OpeningHours[]>(`${this.base}/opening-hours`);
  }
  setHours(days: OpeningHours[]) {
    return this.http.put<OpeningHours[]>(`${this.base}/opening-hours`, { days });
  }

  listStaff() {
    return this.http.get<StaffMember[]>(`${this.base}/staff-members`);
  }
  addStaff(email: string) {
    return this.http.post<StaffMember>(`${this.base}/staff-members`, { email });
  }
  removeStaff(userId: string) {
    return this.http.delete<void>(`${this.base}/staff-members/${userId}`);
  }
}