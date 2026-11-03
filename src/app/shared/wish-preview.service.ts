import { Injectable, signal } from '@angular/core';
import { Wish } from '../core/models';
import { IconName } from './icon';

/** Ein Button im Vorschau-Dialog, z. B. „Verschenken“ oder „Zur Liste hinzufügen“ */
export interface PreviewAction {
  label: string;
  icon: IconName;
  style?: 'primary' | 'success' | 'secondary' | 'ghost' | 'danger';
  /** Dialog nach erfolgreicher Aktion schließen (Standard: ja) */
  close?: boolean;
  run: () => unknown | Promise<unknown>;
}

/** Öffnet einen Wunsch groß (Bild, Beschreibung, Link) mit optionalen Aktionen */
@Injectable({ providedIn: 'root' })
export class WishPreview {
  readonly current = signal<{ wish: Wish; actions: PreviewAction[] } | null>(null);

  open(wish: Wish, actions: PreviewAction[] = []) {
    this.current.set({ wish, actions });
  }

  close() {
    this.current.set(null);
  }
}
