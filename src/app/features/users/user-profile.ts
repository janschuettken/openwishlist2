import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AuthStore } from '../../core/auth.store';
import { I18n, TPipe } from '../../core/i18n';
import { User, WishList, fullName } from '../../core/models';
import { PageTitle, ToastService } from '../../core/ui.services';
import { Icon } from '../../shared/icon';
import { Avatar, EmptyState, ListCard, Loading, PageHeader } from '../../shared/ui';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, Icon, Avatar, PageHeader, ListCard, EmptyState, Loading],
  template: `
    @if (loading()) {
      <app-loading />
    } @else if (!user()) {
      <app-empty icon="user" [title]="'user.notFound' | t" />
    } @else {
      @let u = user()!;
      <app-page-header [title]="name(u)" [back]="true" />
      <section class="card mb-8 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <app-avatar [user]="u" [size]="88" [large]="true" />
        <div class="flex-1">
          <p class="text-lg font-semibold">{{ u.firstName }}</p>
          <p class="muted mt-1 text-sm">{{ 'user.lists' | t: { count: lists().length } }}</p>
        </div>
        @if (!isMe()) {
          @if (isFollowing()) {
            <button type="button" class="btn btn-secondary" (click)="toggleFollow()" [disabled]="busy()">
              <app-icon name="check" [size]="18" />{{ 'following.following' | t }}
            </button>
          } @else {
            <button type="button" class="btn btn-primary" (click)="toggleFollow()" [disabled]="busy()">
              <app-icon name="user-plus" [size]="18" />{{ 'following.follow' | t }}
            </button>
          }
        }
      </section>

      <h2 class="section-title mb-3">{{ 'user.wishlists' | t }}</h2>
      @if (lists().length) {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (l of lists(); track l.eventId) {
            <app-list-card [list]="l" />
          }
        </div>
      } @else {
        <app-empty icon="list" [title]="'user.noLists' | t" [text]="'user.noLists.text' | t" />
      }
    }
  `,
})
export default class UserProfilePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18n);
  private readonly pageTitle = inject(PageTitle);

  readonly id = input.required<string>();

  protected readonly name = fullName;
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly user = signal<User | null>(null);
  protected readonly lists = signal<WishList[]>([]);
  protected readonly isFollowing = signal(false);
  protected readonly isMe = computed(() => this.user()?.userId === this.auth.user()?.userId);

  async ngOnInit() {
    const userId = Number(this.id());
    try {
      const [user, lists, following] = await Promise.all([
        this.api.getUser(userId),
        this.api.getVisibleListsOfUser(userId),
        this.api.getFollowing(this.auth.user()!.userId),
      ]);
      this.user.set(user);
      this.lists.set(lists.filter((l) => !l.archived));
      this.isFollowing.set(following.some((f) => f.userId === userId));
      if (user) this.pageTitle.set(fullName(user));
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  protected async toggleFollow() {
    const u = this.user()!;
    this.busy.set(true);
    try {
      if (this.isFollowing()) await this.api.unfollow(u.userId);
      else await this.api.follow(u.userId);
      this.isFollowing.set(!this.isFollowing());
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
