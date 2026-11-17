export type BookingStatus = 'Confirmed' | 'Cancelled' | 'NoShow';
export type BookingKind = 'Reservation' | 'Block';

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresUtc: string;
  refreshToken: string;
  refreshTokenExpiresUtc: string;
}

export interface Venue {
  name: string;
  address: string | null;
  timeZoneId: string;
}

export interface ResourceType {
  id: string;
  name: string;
  slotMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  maxDaysInAdvance: number;
  cancellationDeadlineHours: number;
  pricePerHour: number;
}

export interface AvailabilityStart {
  start: string; // ISO sa pomakom, npr. 2026-11-14T18:00:00+01:00
  maxDurationMinutes: number;
}

export interface ResourceAvailability {
  resourceId: string;
  resourceName: string;
  starts: AvailabilityStart[];
}

export interface Availability {
  date: string;
  timeZoneId: string;
  slotMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  resources: ResourceAvailability[];
}

export interface CreateBookingRequest {
  resourceId: string;
  start: string;
  durationMinutes: number;
  notes: string | null;
  guestName: string | null;
  guestPhone: string | null;
}

export interface Booking {
  id: string;
  resourceId: string;
  resourceName: string;
  start: string;
  end: string;
  status: BookingStatus;
  kind: BookingKind;
  guestName: string | null;
  guestPhone: string | null;
  notes: string | null;
}

export type DayName =
  | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Resource {
  id: string;
  resourceTypeId: string;
  name: string;
  isActive: boolean;
}

export interface ResourceRequest {
  resourceTypeId: string;
  name: string;
  isActive: boolean;
}

export type ResourceTypeRequest = Omit<ResourceType, 'id'>;

export interface OpeningHours {
  dayOfWeek: DayName;
  openTime: string; // "09:00:00"
  closeTime: string;
}

export interface StaffMember {
  userId: string;
  email: string;
  fullName: string;
}

export interface StaffBooking {
  id: string;
  resourceId: string;
  resourceName: string;
  start: string;
  end: string;
  status: BookingStatus;
  kind: BookingKind;
  userId: string | null;
  displayName: string | null;
  guestName: string | null;
  guestPhone: string | null;
  notes: string | null;
}

export interface CreateBlockRequest {
  resourceId: string | null;
  start: string;
  end: string;
  notes: string | null;
}