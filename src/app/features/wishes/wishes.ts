import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthStore } from '../../core/auth.store';
import { I18n, TPipe } from '../../core/i18n';
import { Wish } from '../../core/models';
import { PageTitle, ToastService } from '../../core/ui.services';
import { Icon } from '../../shared/icon';
import { EmptyState, Loading, PageHeader, WishCard } from '../../shared/ui';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TPipe, Icon, PageHeader, WishCard, EmptyState, Loading],
  template: `
    <app-page-header [title]="'nav.wishes' | t" [subtitle]="'wishes.subtitle' | t">
      <a routerLink="/wish-edit" class="btn btn-primary hidden sm:inline-flex"><app-icon name="plus" [size]="18" />{{ 'wishes.new' | t }}</a>
    </app-page-header>

    <div class="mb-5 inline-flex rounded-xl bg-slate-100 p-1 text-sm dark:bg-slate-800">
      <button type="button" class="rounded-lg px-4 py-1.5 font-medium transition" [class]="tab() === 'active' ? activeTab : idleTab" (click)="tab.set('active')">
        {{ 'wishes.active' | t }} ({{ active().length }})
      </button>
      <button type="button" class="rounded-lg px-4 py-1.5 font-medium transition" [class]="tab() === 'archived' ? activeTab : idleTab" (click)="tab.set('archived')">
        {{ 'common.archived' | t }} ({{ archived().length }})
      </button>
    </div>

    @if (loading()) {
      <app-loading />
    } @else if (shown().length) {
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        @for (w of shown(); track w.wishId) {
          <app-wish-card [wish]="w" [editable]="true" (edit)="router.navigate(['/wish-edit', w.wishId])" />
        }
      </div>
    } @else if (tab() === 'active') {
      <app-empty [title]="'wishes.empty' | t" [text]="'wishes.empty.text' | t">
        <a routerLink="/wish-edit" class="btn btn-primary btn-sm"><app-icon name="plus" [size]="16" />{{ 'wishes.new' | t }}</a>
      </app-empty>
    } @else {
      <app-empty icon="archive" [title]="'wishes.noArchived' | t" />
    }

    <!-- Mobil: schwebender Button -->
    <a
      routerLink="/wish-edit"
      class="fixed right-5 bottom-24 z-30 flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30 active:scale-95 sm:hidden"
      [attr.aria-label]="'wishes.new' | t"
    >
      <app-icon name="plus" [size]="26" />
    </a>
  `,
})
export default class WishesPage {
  protected readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18n);

  protected readonly activeTab = 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white';
  protected readonly idleTab = 'text-slate-500 dark:text-slate-400';

  protected readonly loading = signal(true);
  protected readonly tab = signal<'active' | 'archived'>('active');
  private readonly wishes = signal<Wish[]>([]);
  protected readonly active = computed(() => this.wishes().filter((w) => !w.archived));
  protected readonly archived = computed(() => this.wishes().filter((w) => w.archived));
  protected readonly shown = computed(() => (this.tab() === 'active' ? this.active() : this.archived()));

  constructor() {
    inject(PageTitle).set(this.i18n.t('nav.wishes'));
    this.load();
  }

  private async load() {
    try {
      const list = await this.api.getWishesOfUser(this.auth.user()!.userId);
      this.wishes.set(list.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.loading.set(false);
    }
  }
}
