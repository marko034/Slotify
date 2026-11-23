import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard, guestGuard, ownerGuard, staffGuard } from './core/guards';
import { VenueStore } from './core/venue.store';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    // Podaci o sali (vremenska zona) se učitaju pre prikaza bilo koje stranice
    resolve: { venue: () => inject(VenueStore).ensureLoaded() },
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'book',
        loadComponent: () => import('./pages/book/book.page').then((m) => m.BookPage),
      },
      {
        path: 'my-bookings',
        loadComponent: () =>
          import('./pages/my-bookings/my-bookings.page').then((m) => m.MyBookingsPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'calendar',
        canActivate: [staffGuard],
        loadComponent: () => import('./pages/calendar/calendar.page').then((m) => m.CalendarPage),
      },
      {
        path: 'admin',
        canActivate: [ownerGuard],
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/admin/admin-menu.page').then((m) => m.AdminMenuPage),
          },
          {
            path: 'venue',
            loadComponent: () => import('./pages/admin/admin-venue.page').then((m) => m.AdminVenuePage),
          },
          {
            path: 'hours',
            loadComponent: () => import('./pages/admin/admin-hours.page').then((m) => m.AdminHoursPage),
          },
          {
            path: 'types',
            loadComponent: () => import('./pages/admin/admin-types.page').then((m) => m.AdminTypesPage),
          },
          {
            path: 'resources',
            loadComponent: () =>
              import('./pages/admin/admin-resources.page').then((m) => m.AdminResourcesPage),
          },
          {
            path: 'staff',
            loadComponent: () => import('./pages/admin/admin-staff.page').then((m) => m.AdminStaffPage),
          },
        ],
      },
      { path: '', pathMatch: 'full', redirectTo: 'book' },
    ],
  },
  {
    path: 'check-email',
    loadComponent: () => import('./pages/check-email/check-email.page').then((m) => m.CheckEmailPage),
  },
  {
    path: 'confirm-email',
    loadComponent: () => import('./pages/confirm-email/confirm-email.page').then((m) => m.ConfirmEmailPage),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  { path: '**', redirectTo: '' },
];