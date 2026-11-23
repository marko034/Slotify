import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

const AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/confirm-email',
  '/auth/resend-confirmation',
  '/auth/forgot-password',
  '/auth/reset-password',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isApi = req.url.startsWith(environment.apiUrl);
  const isAuthCall = AUTH_PATHS.some((p) => req.url.includes(p));
  if (!isApi || isAuthCall) return next(req);

  const withToken = (token: string | null) =>
    token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  const usedToken = auth.accessToken();

  return next(withToken(usedToken)).pipe(
    catchError((err: unknown) => {
      const unauthorized = err instanceof HttpErrorResponse && err.status === 401;
      if (!unauthorized || !auth.hasRefreshToken()) return throwError(() => err);

      // Neko drugi zahtev je već osvežio token: samo ponovi
      if (auth.accessToken() !== usedToken && auth.accessToken() !== null) {
        return next(withToken(auth.accessToken()));
      }

      return auth.refresh().pipe(
        switchMap(() => next(withToken(auth.accessToken()))),
        catchError((refreshErr) => {
          if (!auth.isLoggedIn()) auth.goToLogin();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};