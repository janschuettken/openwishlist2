import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthStore } from '../../core/auth.store';
import { I18n, TPipe } from '../../core/i18n';
import { ListWithMembers, Power, User, WishList } from '../../core/models';
import { PageTitle, ToastService } from '../../core/ui.services';
import { Icon } from '../../shared/icon';
import { Avatar, EmptyState, ListCard, Loading } from '../../shared/ui';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TPipe, Icon, Avatar, ListCard, EmptyState, Loading],
  template: `
    <section class="mb-8">
      <p class="muted text-sm">{{ greeting() | t }}</p>
      <h1 class="text-3xl lg:text-4xl">{{ auth.user()?.firstName }} 👋</h1>
    </section>

    <!-- Schnellaktionen -->
    <section class="mb-10 grid grid-cols-2 gap-3 lg:max-w-xl">
      <a routerLink="/wish-edit" class="card flex items-center gap-3 p-4 transition hover:shadow-md">
        <span class="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white"><app-icon name="plus" /></span>
        <span class="text-sm font-medium">{{ 'home.newWish' | t }}</span>
      </a>
      <a routerLink="/event-edit" class="card flex items-center gap-3 p-4 transition hover:shadow-md">
        <span class="flex size-10 items-center justify-center rounded-xl bg-violet-600 text-white"><app-icon name="list" /></span>
        <span class="text-sm font-medium">{{ 'home.newList' | t }}</span>
      </a>
    </section>

    @if (loading()) {
      <app-loading />
    } @else {
      <div class="grid gap-10 lg:grid-cols-3">
        <div class="space-y-10 lg:col-span-2">
          <section>
            <div class="mb-3 flex items-center justify-between">
              <h2 class="section-title">{{ 'home.myLists' | t }}</h2>
              <a routerLink="/events" class="link text-sm">{{ 'common.all' | t }}</a>
            </div>
            @if (myLists().length) {
              <div class="grid gap-3 sm:grid-cols-2">
                @for (l of myLists(); track l.eventId) {
                  <app-list-card [list]="l" />
                }
              </div>
            } @else {
              <app-empty icon="list" [title]="'home.noLists' | t" [text]="'home.noLists.text' | t">
                <a routerLink="/event-edit" class="btn btn-primary btn-sm"><app-icon name="plus" [size]="16" />{{ 'home.newList' | t }}</a>
              </app-empty>
            }
          </section>

          <section>
            <div class="mb-3 flex items-center justify-between">
              <h2 class="section-title">{{ 'home.followedLists' | t }}</h2>
              <a routerLink="/following" class="link text-sm">{{ 'common.all' | t }}</a>
            </div>
            @if (followedLists().length) {
              <div class="grid gap-3 sm:grid-cols-2">
                @for (l of followedLists(); track l.eventId) {
                  <app-list-card [list]="l" [owner]="ownerOf(l)" />
                }
              </div>
            } @else {
              <p class="muted text-sm">{{ 'home.noFollowedLists' | t }}</p>
            }
          </section>
        </div>

        <aside>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="section-title">{{ 'home.people' | t }}</h2>
            <a routerLink="/following" class="link text-sm">{{ 'common.manage' | t }}</a>
          </div>
          <div class="card divide-y divide-slate-100 dark:divide-slate-800">
            @for (u of people(); track u.userId) {
              <a [routerLink]="['/user', u.userId]" class="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <app-avatar [user]="u" [size]="36" />
                <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ u.firstName }} {{ u.lastName }}</span>
                <app-icon name="chevron-right" [size]="16" class="text-slate-300" />
              </a>
            } @empty {
              <div class="p-4 text-sm">
                <p class="muted">{{ 'home.noPeople' | t }}</p>
                <a routerLink="/following" class="link mt-2 inline-block">{{ 'following.find' | t }}</a>
              </div>
            }
          </div>
        </aside>
      </div>
    }
  `,
})
export default class HomePage {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  private readonly lists = signal<WishList[]>([]);
  protected readonly followedLists = signal<ListWithMembers[]>([]);
  protected readonly people = signal<User[]>([]);
  protected readonly myLists = computed(() => this.lists().filter((l) => !l.archived).slice(0, 6));

  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h >= 5 && h < 11 ? 'home.morning' : h >= 11 && h < 18 ? 'home.day' : 'home.evening';
  });

  constructor() {
    inject(PageTitle).set(inject(I18n).t('nav.home'));
    this.load();
  }

  protected ownerOf(l: ListWithMembers): User | null {
    return l.members.find((m) => m.power >= Power.Owner) ?? null;
  }

  private async load() {
    const me = this.auth.user()!;
    try {
      const [lists, followed, people] = await Promise.all([
        this.api.getMyLists(me.userId),
        this.api.getFollowedLists(me.userId),
        this.api.getFollowing(me.userId),
      ]);
      this.lists.set(lists);
      this.people.set(people);
      const withMembers = await Promise.all(
        followed.filter((l) => !l.archived).map(async (l) => ({ ...l, members: await this.api.getMembers(l.eventId) })),
      );
      this.followedLists.set(withMembers);
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.loading.set(false);
    }
  }
}
