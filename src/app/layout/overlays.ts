import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TPipe } from '../core/i18n';
import { ConfirmService, ToastService } from '../core/ui.services';
import { Icon } from '../shared/icon';
import { WishPreviewDialog } from '../shared/wish-preview';

/** Toasts (oben rechts auf Desktop, über der Tab-Leiste auf dem Handy) und Bestätigungsdialog */
@Component({
  selector: 'app-overlays',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TPipe, WishPreviewDialog],
  template: `
    <app-wish-preview />

    <div class="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:top-6 lg:right-6 lg:bottom-auto lg:left-auto lg:items-end">
      @for (t of toasts.toasts(); track t.id) {
        <div
          class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3 text-sm text-white shadow-lg"
          [class.bg-emerald-600]="t.kind === 'success'"
          [class.bg-rose-600]="t.kind === 'error'"
          [class.bg-slate-800]="t.kind === 'info'"
          role="status"
        >
          <app-icon [name]="t.kind === 'success' ? 'check' : t.kind === 'error' ? 'alert' : 'info'" [size]="18" class="mt-px" />
          <span class="flex-1">{{ t.text }}</span>
          <button type="button" class="-mr-1 opacity-70 hover:opacity-100" (click)="toasts.dismiss(t.id)" aria-label="Schließen">
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>

    @if (confirm.current(); as c) {
      <div class="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center" (click)="c.resolve(false)">
        <div class="card w-full max-w-md p-6 pb-safe" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <h2 class="text-lg">{{ c.title }}</h2>
          @if (c.text) {
            <p class="muted mt-2 text-sm">{{ c.text }}</p>
          }
          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" class="btn btn-secondary" (click)="c.resolve(false)">{{ 'common.cancel' | t }}</button>
            <button type="button" class="btn" [class]="c.danger ? 'btn-danger' : 'btn-primary'" (click)="c.resolve(true)">
              {{ c.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class Overlays {
  protected readonly toasts = inject(ToastService);
  protected readonly confirm = inject(ConfirmService);
}
