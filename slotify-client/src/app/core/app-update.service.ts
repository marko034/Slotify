import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { ToastController } from '@ionic/angular';
import { filter, interval } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly toasts = inject(ToastController);

  init(): void {
    if (!this.updates.isEnabled) return;

    this.updates.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(async () => {
        const toast = await this.toasts.create({
          message: 'Dostupna je nova verzija aplikacije.',
          position: 'bottom',
          buttons: [{ text: 'Osveži', handler: () => document.location.reload() }],
        });
        await toast.present();
      });

    // Proveri ažuriranja jednom na sat
    interval(60 * 60 * 1000).subscribe(() => this.updates.checkForUpdate().catch(() => {}));
  }
}