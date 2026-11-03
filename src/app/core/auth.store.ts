import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { User } from './models';
import { storage, StorageKeys } from './storage';

/**
 * Hält den eingeloggten Nutzer. Beim Start wird per gespeichertem loginToken
 * automatisch eingeloggt (wie in der alten App).
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => (this.user()?.userId ?? -1) > 0);
  readonly isAdmin = computed(() => (this.user()?.power ?? 0) >= 100);
  /** true, wenn ein Admin gerade als anderer Nutzer eingeloggt ist */
  readonly impersonating = signal(!!storage.get(StorageKeys.adminLoginToken));

  private initPromise: Promise<void> | null = null;

  /** Einmaliger Auto-Login beim App-Start; Guards warten darauf */
  init(): Promise<void> {
    this.initPromise ??= this.restore();
    return this.initPromise;
  }

  private async restore() {
    const token = storage.get(StorageKeys.loginToken);
    if (!token) return;
    try {
      const { user } = await this.api.loginWithToken(token);
      this.user.set(user);
    } catch (e) {
      // Token ungültig: abmelden. Netzwerkfehler: Token behalten.
      if (e instanceof Error && e.message !== 'Failed to fetch') {
        storage.remove(StorageKeys.loginToken);
        storage.remove(StorageKeys.session);
      }
    }
  }

  async login(email: string, password: string) {
    const { user } = await this.api.login(email, password);
    storage.set(StorageKeys.loginToken, user.loginToken ?? null);
    this.user.set(user);
    this.initPromise = Promise.resolve();
  }

  async register(data: { email: string; password: string; firstName: string; lastName: string }) {
    await this.api.register(data);
    await this.login(data.email, data.password);
  }

  /** Nutzer neu laden, z. B. nach Profiländerung oder Bild-Upload */
  async refresh() {
    const token = storage.get(StorageKeys.loginToken);
    if (!token) return;
    const { user } = await this.api.loginWithToken(token);
    this.user.set(user);
  }

  async logout() {
    storage.remove(StorageKeys.loginToken);
    storage.remove(StorageKeys.session);
    storage.remove(StorageKeys.adminLoginToken);
    this.impersonating.set(false);
    this.user.set(null);
    await this.router.navigate(['/login']);
  }

  /** Admin: als anderer Nutzer einloggen */
  async impersonate(loginToken: string) {
    const adminToken = storage.get(StorageKeys.loginToken);
    const { user } = await this.api.loginWithToken(loginToken);
    if (!storage.get(StorageKeys.adminLoginToken)) storage.set(StorageKeys.adminLoginToken, adminToken);
    storage.set(StorageKeys.loginToken, loginToken);
    this.impersonating.set(true);
    this.user.set(user);
    await this.router.navigate(['/home']);
  }

  async backToAdmin() {
    const adminToken = storage.get(StorageKeys.adminLoginToken);
    if (!adminToken) return;
    const { user } = await this.api.loginWithToken(adminToken);
    storage.set(StorageKeys.loginToken, adminToken);
    storage.remove(StorageKeys.adminLoginToken);
    this.impersonating.set(false);
    this.user.set(user);
    await this.router.navigate(['/admin']);
  }
}
