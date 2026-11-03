import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthStore } from '../../core/auth.store';
import { I18n, TPipe } from '../../core/i18n';
import { WishList } from '../../core/models';
import { PageTitle, ToastService } from '../../core/ui.services';
import { Icon } from '../../shared/icon';
import { EmptyState, ListCard, Loading, PageHeader } from '../../shared/ui';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TPipe, Icon, PageHeader, ListCard, EmptyState, Loading],
  template: `
    <app-page-header [title]="'nav.lists' | t" [subtitle]="'lists.subtitle' | t">
      <a routerLink="/event-edit" class="btn btn-primary hidden sm:inline-flex"><app-icon name="plus" [size]="18" />{{ 'lists.new' | t }}</a>
    </app-page-header>

    @if (loading()) {
      <app-loading />
    } @else if (active().length) {
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        @for (l of active(); track l.eventId) {
          <app-list-card [list]="l" />
        }
      </div>
    } @else {
      <app-empty icon="list" [title]="'home.noLists' | t" [text]="'home.noLists.text' | t">
        <a routerLink="/event-edit" class="btn btn-primary btn-sm"><app-icon name="plus" [size]="16" />{{ 'lists.new' | t }}</a>
      </app-empty>
    }

    @if (archived().length) {
      <details class="group mt-10">
        <summary class="section-title flex cursor-pointer list-none items-center gap-2">
          <app-icon name="chevron-right" [size]="16" class="transition group-open:rotate-90" />
          {{ 'common.archived' | t }} ({{ archived().length }})
        </summary>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (l of archived(); track l.eventId) {
            <app-list-card [list]="l" />
          }
        </div>
      </details>
    }

    <a
      routerLink="/event-edit"
      class="fixed right-5 bottom-24 z-30 flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30 active:scale-95 sm:hidden"
      [attr.aria-label]="'lists.new' | t"
    >
      <app-icon name="plus" [size]="26" />
    </a>
  `,
})
export default class EventsPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  private readonly lists = signal<WishList[]>([]);
  protected readonly active = computed(() => this.lists().filter((l) => !l.archived));
  protected readonly archived = computed(() => this.lists().filter((l) => l.archived));

  constructor() {
    inject(PageTitle).set(inject(I18n).t('nav.lists'));
    this.load();
  }

  private async load() {
    try {
      const lists = await this.api.getMyLists(this.auth.user()!.userId);
      this.lists.set(lists.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.loading.set(false);
    }
  }
}
