import { Pipe, PipeTransform, inject } from '@angular/core';
import { formatDate, formatTime } from './time';
import { VenueStore } from './venue.store';

@Pipe({ name: 'venueTime', standalone: true })
export class VenueTimePipe implements PipeTransform {
  private readonly zone = inject(VenueStore).timeZone;

  transform(iso: string | null | undefined, kind: 'time' | 'date' | 'datetime' = 'time'): string {
    if (!iso) return '';
    const tz = this.zone();
    switch (kind) {
      case 'date':
        return formatDate(iso, tz);
      case 'datetime':
        return `${formatDate(iso, tz)}, ${formatTime(iso, tz)}`;
      default:
        return formatTime(iso, tz);
    }
  }
}