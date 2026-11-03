import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthStore } from '../../core/auth.store';
import { I18n, TPipe } from '../../core/i18n';
import { ListWithMembers, Power, User, fullName } from '../../core/models';
import { ConfirmService, PageTitle, ToastService } from '../../core/ui.services';
import { Icon } from '../../shared/icon';
import { Avatar, EmptyState, ListCard, Loading, PageHeader } from '../../shared/ui';
import { UserSearch } from '../../shared/user-search';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TPipe, Icon, Avatar, PageHeader, ListCard, EmptyState, Loading, UserSearch],
  template: `
    <app-page-header [title]="'nav.following' | t" [subtitle]="'following.subtitle' | t" />

    <div class="grid gap-10 lg:grid-cols-[360px_1fr]">
      <section>
        <h2 class="section-title mb-3">{{ 'following.people' | t }}</h2>
        <app-user-search [placeholder]="'following.search' | t" [excludeIds]="excludeIds()" (selected)="follow($event)" />

        <div class="card mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          @for (u of people(); track u.userId) {
            <div class="flex items-center gap-3 px-4 py-3">
              <a [routerLink]="['/user', u.userId]" class="flex min-w-0 flex-1 items-center gap-3">
                <app-avatar [user]="u" [size]="40" />
                <span class="truncate font-medium text-slate-900 dark:text-slate-100">{{ name(u) }}</span>
              </a>
              <button type="button" class="btn btn-ghost p-2 text-slate-400 hover:text-rose-600" (click)="unfollow(u)" [title]="'following.unfollow' | t">
                <app-icon name="user-minus" [size]="18" />
              </button>
            </div>
          } @empty {
            <p class="muted p-4 text-sm">{{ 'home.noPeople' | t }}</p>
          }
        </div>
      </section>

      <section>
        <h2 class="section-title mb-3">{{ 'following.lists' | t }}</h2>
        @if (loading()) {
          <app-loading />
        } @else if (lists().length) {
          <div class="grid gap-4 sm:grid-cols-2">
            @for (l of lists(); track l.eventId) {
              <app-list-card [list]="l" [owner]="ownerOf(l)" />
            }
          </div>
        } @else {
          <app-empty icon="heart" [title]="'following.noLists' | t" [text]="'following.noLists.text' | t" />
        }
      </section>
    </div>
  `,
})
export default class FollowingPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly i18n = inject(I18n);

  protected readonly name = fullName;
  protected readonly loading = signal(true);
  protected readonly people = signal<User[]>([]);
  protected readonly lists = signal<ListWithMembers[]>([]);
  protected readonly excludeIds = computed(() => [this.auth.user()!.userId, ...this.people().map((p) => p.userId)]);

  constructor() {
    inject(PageTitle).set(this.i18n.t('nav.following'));
    this.load();
  }

  protected ownerOf(l: ListWithMembers) {
    return l.members.find((m) => m.power >= Power.Owner) ?? null;
  }

  private async load() {
    const me = this.auth.user()!.userId;
    try {
      const [people, lists] = await Promise.all([this.api.getFollowing(me), this.api.getFollowedLists(me)]);
      this.people.set(people);
      this.lists.set(
        await Promise.all(lists.map(async (l) => ({ ...l, members: await this.api.getMembers(l.eventId) }))),
      );
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  protected async follow(u: User) {
    try {
      await this.api.follow(u.userId);
      this.people.set(await this.api.getFollowing(this.auth.user()!.userId));
      this.toast.success(this.i18n.t('following.now', { name: u.firstName }));
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async unfollow(u: User) {
    if (!(await this.confirm.ask(this.i18n.t('following.unfollow.confirm', { name: fullName(u) }), { confirmLabel: this.i18n.t('following.unfollow') }))) return;
    try {
      await this.api.unfollow(u.userId);
      this.people.update((list) => list.filter((p) => p.userId !== u.userId));
    } catch (e) {
      this.toast.error(e);
    }
  }
}
