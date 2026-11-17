import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(
  err: unknown,
  fallback = 'Došlo je do greške. Pokušaj ponovo.',
): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;

  if (err.status === 0) return 'Nema veze sa serverom. Proveri internet konekciju.';
  if (err.status === 429) return 'Previše pokušaja. Sačekaj minut pa pokušaj ponovo.';

  const errors = err.error?.errors;
  if (Array.isArray(errors) && errors.length > 0) return errors.join(' ');
  if (errors && typeof errors === 'object') {
    const messages = Object.values(errors)
      .flat()
      .filter((m): m is string => typeof m === 'string');
    if (messages.length > 0) return messages.join(' ');
  }

  if (err.status === 401) return 'Niste prijavljeni.';
  if (err.status === 403) return 'Nemate dozvolu za ovu akciju.';
  if (err.status >= 500) return 'Greška na serveru. Pokušaj ponovo kasnije.';
  return fallback;
}