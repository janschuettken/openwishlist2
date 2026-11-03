import { Injectable, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { ApiError } from './api.service';
import { I18n } from './i18n';
import { storage, StorageKeys } from './storage';

// ---------------- Toasts ----------------

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly i18n = inject(I18n);
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  success(text: string) {
    this.push('success', text);
  }

  info(text: string) {
    this.push('info', text);
  }

  /** Nimmt Strings, ApiError oder beliebige Fehler */
  error(e: unknown) {
    let text: string;
    if (e instanceof ApiError && e.sessionError) text = this.i18n.t('error.session');
    else if (e instanceof Error) text = e.message;
    else if (typeof e === 'string') text = e;
    else text = this.i18n.t('error.generic');
    if (text === 'Failed to fetch') text = this.i18n.t('error.network');
    this.push('error', text);
  }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, text: string) {
    const id = this.nextId++;
    this.toasts.update((list) => [...list.slice(-3), { id, kind, text }]);
    setTimeout(() => this.dismiss(id), kind === 'error' ? 6000 : 3500);
  }
}

// ---------------- Bestätigungsdialog ----------------

export interface ConfirmRequest {
  title: string;
  text?: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly i18n = inject(I18n);
  readonly current = signal<ConfirmRequest | null>(null);

  ask(title: string, opts: { text?: string; confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
    return new Promise((resolve) => {
      this.current.set({
        title,
        text: opts.text,
        confirmLabel: opts.confirmLabel ?? this.i18n.t('common.confirm'),
        danger: opts.danger ?? true,
        resolve: (ok) => {
          this.current.set(null);
          resolve(ok);
        },
      });
    });
  }
}

// ---------------- Theme ----------------

export type ThemeMode = 'system' | 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>((storage.get(StorageKeys.theme) as ThemeMode) || 'system');
  private readonly media = matchMedia('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media.matches);

  constructor() {
    this.media.addEventListener('change', (e) => this.systemDark.set(e.matches));
    effect(() => {
      const mode = this.mode();
      const dark = mode === 'dark' || (mode === 'system' && this.systemDark());
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#020617' : '#4f46e5');
      storage.set(StorageKeys.theme, mode);
    });
  }

  set(mode: ThemeMode) {
    this.mode.set(mode);
  }
}

// ---------------- Seitentitel ----------------

@Injectable({ providedIn: 'root' })
export class PageTitle {
  private readonly title = inject(Title);
  readonly current = signal('');

  constructor() {
    effect(() => {
      const page = this.current();
      this.title.setTitle(page ? `${page} · ${environment.appTitle}` : environment.appTitle);
    });
  }

  set(text: string) {
    this.current.set(text);
  }
}
