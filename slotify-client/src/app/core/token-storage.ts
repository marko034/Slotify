import { Injectable } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private readonly key = 'slotify.refresh';
  private readonly native = Capacitor.isNativePlatform();
  private cache: string | null = null;

  /** Poziva se jednom pri pokretanju aplikacije, pre prvog čitanja. */
  async load(): Promise<void> {
    try {
      if (this.native) {
        const value = await SecureStorage.get(this.key);
        this.cache = typeof value === 'string' ? value : null;
      } else {
        this.cache = localStorage.getItem(this.key);
      }
    } catch {
      this.cache = null;
    }
  }

  get(): string | null {
    return this.cache;
  }

  set(token: string): void {
    this.cache = token;
    void this.persist(token);
  }

  clear(): void {
    this.cache = null;
    void this.persist(null);
  }

  private async persist(token: string | null): Promise<void> {
    try {
      if (this.native) {
        if (token === null) await SecureStorage.remove(this.key);
        else await SecureStorage.set(this.key, token);
      } else if (token === null) {
        localStorage.removeItem(this.key);
      } else {
        localStorage.setItem(this.key, token);
      }
    } catch {
      /* skladište nedostupno: sesija važi do zatvaranja aplikacije */
    }
  }
}