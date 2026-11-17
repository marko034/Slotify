import { DayName } from "./models";

const LOCALE = 'sr-Latn-RS';

/** Današnji datum (yyyy-MM-dd) u zadatoj vremenskoj zoni. */
export function todayInZone(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));
}

/** Za čist datum (yyyy-MM-dd) bez vremena. */
export function formatDateOnly(date: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'RSD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const DAYS: { key: DayName; label: string }[] = [
  { key: 'Monday', label: 'Ponedeljak' },
  { key: 'Tuesday', label: 'Utorak' },
  { key: 'Wednesday', label: 'Sreda' },
  { key: 'Thursday', label: 'Četvrtak' },
  { key: 'Friday', label: 'Petak' },
  { key: 'Saturday', label: 'Subota' },
  { key: 'Sunday', label: 'Nedelja' },
];

/** "09:00" -> "09:00:00" (backend očekuje sekunde za TimeOnly). */
export function toApiTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

/** "09:00:00" -> "09:00". */
export function fromApiTime(time: string): string {
  return time.slice(0, 5);
}

function zoneOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));

  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asIfUtc - utcMs) / 60_000);
}

/** Lokalni datum i vreme u zoni sale -> UTC trenutak kao ISO tekst. */
export function zonedToUtcIso(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);

  let utc = wall - zoneOffsetMinutes(wall, timeZone) * 60_000;
  utc = wall - zoneOffsetMinutes(utc, timeZone) * 60_000; // drugi prolaz zbog letnjeg računanja vremena
  return new Date(utc).toISOString();
}