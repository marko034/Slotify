import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  firstValueFrom,
  map,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse } from './models';
import { TokenStorage } from './token-storage';
import { VenueStore } from './venue.store';

interface JwtPayload {
  sub: string;
  email?: string;
  role?: string | string[];
}

function decodeJwt(token: string): JwtPayload {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  );
  return JSON.parse(json) as JwtPayload;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(TokenStorage);
  private readonly venue = inject(VenueStore);
  private readonly base = `${environment.apiUrl}/auth`;

  // Access token živi samo u memoriji, refresh token u skladištu.
  private readonly _accessToken = signal<string | null>(null);
  readonly accessToken = this._accessToken.asReadonly();

  readonly user = computed(() => {
    const token = this._accessToken();
    if (!token) return null;
    try {
      const payload = decodeJwt(token);
      return {
        id: payload.sub,
        email: payload.email ?? '',
        roles: ([] as string[]).concat(payload.role ?? []),
      };
    } catch {
      return null;
    }
  });

  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly isOwner = computed(() => this.user()?.roles.includes('Owner') ?? false);
  readonly isStaff = computed(() => {
    const roles = this.user()?.roles ?? [];
    return roles.includes('Owner') || roles.includes('Staff');
  });

  private refreshInFlight$: Observable<void> | null = null;

  /** Poziva se pri pokretanju aplikacije: tiho obnovi sesiju ako postoji refresh token. */
  async init(): Promise<void> {
    await this.storage.load();
    if (!this.storage.get()) return;
    try {
      await firstValueFrom(this.refresh());
    } catch {
      /* token istekao ili nema mreže: korisnik će videti prijavu */
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/login`, { email, password })
      .pipe(tap((r) => this.apply(r)));
  }

  /** Registracija više ne prijavljuje korisnika: prvo mora da potvrdi email. */
  register(email: string, password: string, fullName: string): Observable<void> {
    return this.http.post<void>(`${this.base}/register`, { email, password, fullName });
  }

  confirmEmail(userId: string, token: string): Observable<void> {
    return this.http.post<void>(`${this.base}/confirm-email`, { userId, token });
  }

  resendConfirmation(email: string): Observable<void> {
    return this.http.post<void>(`${this.base}/resend-confirmation`, { email });
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.base}/forgot-password`, { email });
  }

  resetPassword(userId: string, token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/reset-password`, { userId, token, newPassword });
  }

  /** Server prekida ostale sesije, a ovoj vraća nove tokene. */
  changePassword(currentPassword: string, newPassword: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/change-password`, { currentPassword, newPassword })
      .pipe(tap((r) => this.apply(r)));
  }

  deleteAccount(password: string): Observable<void> {
    return this.http.post<void>(`${this.base}/delete-account`, { password }).pipe(
      tap(() => {
        this.clearSession();
        void this.router.navigateByUrl('/login');
      }),
    );
  }

  /**
   * Svi paralelni pozivi dele jedan zahtev. Server rotira refresh tokene,
   * pa bi dva istovremena osvežavanja istim tokenom odjavila korisnika.
   */
  refresh(): Observable<void> {
    if (this.refreshInFlight$) return this.refreshInFlight$;

    const token = this.storage.get();
    if (!token) return throwError(() => new Error('Nema refresh tokena.'));

    this.refreshInFlight$ = this.http
      .post<AuthResponse>(`${this.base}/refresh`, { refreshToken: token })
      .pipe(
        tap((r) => this.apply(r)),
        map(() => undefined),
        catchError((err) => {
          // Server je odbio token: sesija je gotova. Greška mreže ne briše ništa.
          if (err instanceof HttpErrorResponse && (err.status === 400 || err.status === 401)) {
            this.clearSession();
          }
          return throwError(() => err);
        }),
        finalize(() => (this.refreshInFlight$ = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.refreshInFlight$;
  }

  logout(): void {
    const token = this.storage.get();
    this.clearSession();
    void this.router.navigateByUrl('/login');
    if (token) {
      this.http.post(`${this.base}/logout`, { refreshToken: token }).subscribe({ error: () => { } });
    }
  }

  hasRefreshToken(): boolean {
    return this.storage.get() !== null;
  }

  goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }

  private apply(r: AuthResponse): void {
    this._accessToken.set(r.accessToken);
    this.storage.set(r.refreshToken);
  }

  private clearSession(): void {
    this._accessToken.set(null);
    this.storage.clear();
    this.venue.clear();
  }
}