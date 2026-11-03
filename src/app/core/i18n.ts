import { Injectable, Pipe, PipeTransform, computed, inject, signal } from '@angular/core';
import { DE } from '../i18n/de';
import { EN } from '../i18n/en';
import { storage, StorageKeys } from './storage';

export type Lang = 'de' | 'en';
export type TKey = keyof typeof DE;
export type TParams = Record<string, string | number | null | undefined>;

const DICTS: Record<Lang, Record<TKey, string>> = { de: DE, en: EN };

/** Schlanke Übersetzung über Signals. Platzhalter im Text: {name} */
@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>(I18n.initialLang());
  private readonly dict = computed(() => DICTS[this.lang()]);

  constructor() {
    document.documentElement.lang = this.lang();
  }

  setLang(lang: Lang) {
    this.lang.set(lang);
    storage.set(StorageKeys.lang, lang);
    document.documentElement.lang = lang;
  }

  t(key: TKey, params?: TParams): string {
    let text = this.dict()[key] ?? DE[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v ?? ''));
    }
    return text;
  }

  get locale(): string {
    return this.lang() === 'de' ? 'de-DE' : 'en-GB';
  }

  formatDate(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
    if (!value) return '';
    const d = new Date(value.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(this.locale, opts);
  }

  private static initialLang(): Lang {
    const saved = storage.get(StorageKeys.lang);
    if (saved === 'de' || saved === 'en') return saved;
    return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en';
  }
}

/** {{ 'key' | t }} oder {{ 'key' | t: { name: x } }} */
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(key: TKey, params?: TParams): string {
    return this.i18n.t(key, params);
  }
}

/** {{ date | appDate }} */
@Pipe({ name: 'appDate', pure: false })
export class AppDatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(value: string | null | undefined, style: 'short' | 'medium' | 'long' = 'medium'): string {
    return this.i18n.formatDate(value, { dateStyle: style });
  }
}
