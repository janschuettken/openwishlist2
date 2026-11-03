import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { AuthStore } from '../core/auth.store';
import { I18n, TPipe } from '../core/i18n';
import { Wish, shortUrl } from '../core/models';
import { ToastService } from '../core/ui.services';
import { Icon } from './icon';
import { PreviewAction, WishPreview } from './wish-preview.service';
import { RichTextPipe, Spinner } from './ui';

@Component({
  selector: 'app-wish-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TPipe, RichTextPipe, Spinner],
  host: { '(document:keydown.escape)': 'preview.close()' },
  template: `
    @if (preview.current(); as c) {
      @let w = c.wish;
      <div class="fixed inset-0 z-[65] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" (click)="preview.close()">
        <div
          class="card flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-b-none pb-safe sm:rounded-b-2xl"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <div class="relative flex max-h-[45dvh] min-h-40 shrink-0 items-center justify-center bg-slate-100 dark:bg-slate-800">
            @if (w.wishImgUrl) {
              <img [src]="w.wishImgUrl" alt="" class="max-h-[45dvh] w-full object-contain" />
            } @else {
              <app-icon name="gift" [size]="56" class="text-slate-300 dark:text-slate-600" />
            }
            <button
              type="button"
              class="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80"
              (click)="preview.close()"
              [attr.aria-label]="'common.close' | t"
            >
              <app-icon name="x" [size]="18" />
            </button>
          </div>
          <div class="overflow-y-auto p-5">
            <h3 class="text-xl font-semibold break-words">{{ w.title }}</h3>
            @if (w.archived) {
              <span class="chip mt-2 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{{ 'common.archived' | t }}</span>
            }
            @if (w.description) {
              <p class="mt-3 text-sm break-words text-slate-600 dark:text-slate-300" [innerHTML]="w.description | rich"></p>
            }
            @if (w.url) {
              <a [href]="w.url" target="_blank" rel="noopener noreferrer" class="btn btn-secondary mt-4 w-full sm:w-auto">
                <app-icon name="external" [size]="16" />{{ 'wish.openLink' | t: { host: host(w.url) } }}
              </a>
            }
          </div>
          @if (actions().length) {
            <div class="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end dark:border-slate-800">
              @for (a of actions(); track a.label) {
                <button type="button" class="btn" [class]="'btn-' + (a.style ?? 'primary')" (click)="run(a)" [disabled]="busy()">
                  @if (busy() === a.label) {
                    <app-spinner />
                  } @else {
                    <app-icon [name]="a.icon" [size]="18" />
                  }
                  {{ a.label }}
                </button>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class WishPreviewDialog {
  protected readonly preview = inject(WishPreview);
  private readonly toast = inject(ToastService);
  protected readonly busy = signal<string | null>(null);
  protected readonly host = shortUrl;
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18n);

  /** Aktionen des Aufrufers, bei eigenen Wünschen immer plus „Bearbeiten“ */
  protected readonly actions = computed<PreviewAction[]>(() => {
    const c = this.preview.current();
    if (!c) return [];
    if (c.wish.userId !== this.auth.user()?.userId) return c.actions;
    const edit: PreviewAction = {
      label: this.i18n.t('common.edit'),
      icon: 'edit',
      style: c.actions.length ? 'secondary' : 'primary',
      run: () => this.router.navigate(['/wish-edit', c.wish.wishId]),
    };
    return [edit, ...c.actions];
  });

  constructor() {
    // Beim Seitenwechsel (z. B. Zurück-Taste auf dem Handy) Dialog schließen
    this.router.events.pipe(takeUntilDestroyed())
      .subscribe((e) => e instanceof NavigationStart && this.preview.close());
  }

  protected async run(a: PreviewAction) {
    this.busy.set(a.label);
    try {
      await a.run();
      if (a.close !== false) this.preview.close();
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(null);
    }
  }
}
