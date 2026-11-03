import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthStore } from '../../core/auth.store';
import { AppDatePipe, I18n, TPipe } from '../../core/i18n';
import { ListType, Member, Power, User, Wish, WishList, fullName, isFullyClaimed } from '../../core/models';
import { PageTitle, ToastService } from '../../core/ui.services';
import { Icon } from '../../shared/icon';
import { Avatar, EmptyState, LIST_TYPE_META, ListTypeBadge, Loading, PageHeader, Spinner, UserRow, WishCard } from '../../shared/ui';

interface WishGroup {
  user: Member | User;
  own: boolean;
  wishes: Wish[];
}

/**
 * Detailansicht einer Wunschliste.
 * Eigene Wünsche werden ohne Reservierungsstand gezeigt (keine Spoiler),
 * Wünsche anderer mit Stand und Buttons zum Verschenken.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgTemplateOutlet, TPipe, AppDatePipe, Icon, Avatar, PageHeader, ListTypeBadge, WishCard, EmptyState, Loading, Spinner, UserRow],
  template: `
    @if (loading()) {
      <app-loading />
    } @else if (!list()) {
      <app-empty icon="alert" [title]="'list.notFound' | t" />
    } @else {
      @let l = list()!;
      <app-page-header [title]="l.eventTitle" [back]="true">
        <button type="button" class="btn btn-ghost p-2" (click)="share()" [title]="'list.share' | t">
          <app-icon name="share" [size]="18" />
        </button>
        @if (isOwner()) {
          <a [routerLink]="['/event-edit', l.eventId]" class="btn btn-secondary">
            <app-icon name="settings" [size]="18" /><span class="hidden sm:inline">{{ 'common.edit' | t }}</span>
          </a>
        }
      </app-page-header>

      <!-- Kopfbereich -->
      <section class="card mb-8 p-5 lg:p-6">
        <div class="flex flex-wrap items-center gap-2">
          <app-list-type-badge [type]="l.eventType" />
          @if (l.archived) {
            <span class="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{{ 'common.archived' | t }}</span>
          }
          @if (l.deadline) {
            <span class="chip bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              <app-icon name="calendar" [size]="12" />{{ l.deadline | appDate: 'long' }}
            </span>
          }
        </div>
        @if (l.eventDescription) {
          <p class="mt-3 whitespace-pre-line text-slate-700 dark:text-slate-300">{{ l.eventDescription }}</p>
        }
        @if (owner(); as o) {
          <a [routerLink]="['/user', o.userId]" class="mt-4 inline-flex items-center gap-2 text-sm">
            <app-avatar [user]="o" [size]="28" />
            <span class="muted">{{ 'list.by' | t }}</span>
            <span class="font-medium text-slate-900 dark:text-slate-100">{{ name(o) }}</span>
          </a>
        }

        <!-- Folgen / Benachrichtigungen für Nicht-Mitglieder -->
        @if (!isMember() && l.eventType !== ListType.Private) {
          <div class="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            @if (!me()) {
              <button type="button" class="btn btn-primary btn-sm" (click)="follow()" [disabled]="busy()">
                <app-icon name="heart" [size]="16" />{{ 'list.follow' | t }}
              </button>
              <span class="muted text-xs">{{ 'list.follow.hint' | t }}</span>
            } @else {
              <button type="button" class="btn btn-secondary btn-sm" (click)="toggleNotify()" [disabled]="busy()">
                <app-icon [name]="me()!.notify ? 'bell-off' : 'bell'" [size]="16" />
                {{ (me()!.notify ? 'list.unsubscribe' : 'list.subscribe') | t }}
              </button>
              <button type="button" class="btn btn-ghost btn-sm" (click)="unfollow()" [disabled]="busy()">{{ 'list.unfollow' | t }}</button>
            }
          </div>
        }
      </section>

      @if (l.eventType === ListType.Private && !me()) {
        <app-empty icon="lock" [title]="'list.private' | t" [text]="'list.private.text' | t" />
      } @else {
        <div class="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div class="min-w-0 space-y-10">
            <!-- Wichteln -->
            @if (l.eventType === ListType.SecretSanta) {
              <section class="overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 p-5 text-white lg:p-6">
                <div class="flex items-center gap-2">
                  <app-icon name="sparkles" />
                  <h2 class="text-lg">{{ 'santa.title' | t }}</h2>
                </div>
                @if (!l.santaGenerated) {
                  <p class="mt-2 text-rose-50">{{ 'santa.notStarted' | t }}</p>
                } @else if (receiver(); as r) {
                  <div class="mt-4 flex items-center gap-3 rounded-xl bg-white/15 p-3 backdrop-blur">
                    <app-avatar [user]="r" [size]="48" />
                    <div>
                      <p class="text-sm text-rose-50">{{ 'santa.yourReceiver' | t }}</p>
                      <p class="text-lg font-semibold">{{ name(r) }}</p>
                    </div>
                  </div>
                }
              </section>

              @if (receiver(); as r) {
                <section>
                  <h2 class="section-title mb-3">{{ 'santa.receiverWishes' | t: { name: r.firstName } }}</h2>
                  <div class="grid gap-4 xl:grid-cols-2">
                    @for (w of receiverWishes(); track w.wishId) {
                      <app-wish-card [wish]="w" [showClaim]="true">
                        <ng-container *ngTemplateOutlet="claimButtons; context: { $implicit: w }" />
                      </app-wish-card>
                    } @empty {
                      <p class="muted text-sm">{{ 'santa.noWishes' | t }}</p>
                    }
                  </div>
                </section>
              }
            }

            <!-- Wünsche, gruppiert nach Person -->
            @for (g of groups(); track g.user.userId) {
              <section>
                <div class="mb-3 flex items-center gap-2">
                  @if (groups().length > 1 || !g.own) {
                    <app-avatar [user]="g.user" [size]="24" />
                  }
                  <h2 class="section-title flex-1">
                    @if (g.own) {
                      {{ (l.eventType === ListType.SecretSanta ? 'santa.myWishes' : 'list.myWishes') | t }}
                    } @else {
                      {{ 'list.wishesOf' | t: { name: g.user.firstName } }}
                    }
                  </h2>
                  @if (g.own) {
                    <a [routerLink]="['/wish-edit', -1, l.eventId]" class="btn btn-primary btn-sm"><app-icon name="plus" [size]="16" />{{ 'wish.new' | t }}</a>
                  }
                </div>
                <div class="grid gap-4 xl:grid-cols-2">
                  @for (w of g.wishes; track w.wishId) {
                    <app-wish-card [wish]="w" [showClaim]="!g.own">
                      @if (g.own || isOwner()) {
                        <button type="button" class="btn btn-ghost btn-sm text-rose-600 dark:text-rose-400" (click)="removeFromList(w)">
                          <app-icon name="x" [size]="14" />{{ 'list.removeWish' | t }}
                        </button>
                      }
                      @if (!g.own) {
                        <ng-container *ngTemplateOutlet="claimButtons; context: { $implicit: w }" />
                      }
                    </app-wish-card>
                  } @empty {
                    <p class="muted text-sm">{{ 'list.noWishes' | t }}</p>
                  }
                </div>
              </section>
            }
            @if (!groups().length) {
              <app-empty [title]="'list.empty' | t" [text]="canAddWishes() ? ('list.empty.member' | t) : ''">
                @if (canAddWishes()) {
                  <a [routerLink]="['/wish-edit', -1, l.eventId]" class="btn btn-primary btn-sm"><app-icon name="plus" [size]="16" />{{ 'wish.new' | t }}</a>
                }
              </app-empty>
            }
          </div>

          <!-- Seitenleiste: eigene Wünsche hinzufügen, Mitglieder -->
          <aside class="space-y-8">
            @if (canAddWishes()) {
              <section>
                <h2 class="section-title mb-3">{{ 'list.addOwn' | t }}</h2>
                <div class="card divide-y divide-slate-100 dark:divide-slate-800">
                  @for (w of addable(); track w.wishId) {
                    <div class="flex items-center gap-3 px-4 py-2.5">
                      <span class="min-w-0 flex-1 truncate text-sm">{{ w.title }}</span>
                      <button type="button" class="btn btn-ghost btn-sm p-1.5 text-brand-600 dark:text-brand-400" (click)="addToList(w)" [disabled]="adding() === w.wishId" [title]="'list.addWish' | t">
                        @if (adding() === w.wishId) {
                          <app-spinner [size]="14" />
                        } @else {
                          <app-icon name="plus" [size]="18" />
                        }
                      </button>
                    </div>
                  } @empty {
                    <p class="muted p-4 text-sm">{{ 'list.addOwn.empty' | t }}</p>
                  }
                </div>
              </section>
            }

            @if (l.eventType !== ListType.Private && members().length > 1) {
              <section>
                <h2 class="section-title mb-3">{{ 'list.members' | t }} ({{ members().length }})</h2>
                <div class="card space-y-3 p-4">
                  @for (m of members(); track m.userId) {
                    <a [routerLink]="['/user', m.userId]" class="block">
                      <app-user-row [user]="m" [size]="32" [sub]="roleLabel(m) | t" />
                    </a>
                  }
                </div>
              </section>
            }
          </aside>
        </div>
      }

      <ng-template #claimButtons let-w>
        @if (w.claimedByUser > 0) {
          <button type="button" class="btn btn-secondary btn-sm" (click)="unclaim(w)" [disabled]="busy()">
            <app-icon name="undo" [size]="14" />{{ 'claim.undo' | t }}
          </button>
        } @else if (!full(w)) {
          <button type="button" class="btn btn-success btn-sm" (click)="claim(w)" [disabled]="busy()">
            <app-icon name="gift" [size]="14" />{{ 'claim.do' | t }}
          </button>
        }
      </ng-template>
    }
  `,
})
export default class EventDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18n);
  private readonly pageTitle = inject(PageTitle);

  readonly id = input.required<string>();

  protected readonly ListType = ListType;
  protected readonly name = fullName;
  protected readonly full = isFullyClaimed;

  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly adding = signal<number | null>(null);
  protected readonly list = signal<WishList | null>(null);
  protected readonly members = signal<Member[]>([]);
  protected readonly groups = signal<WishGroup[]>([]);
  protected readonly myWishes = signal<Wish[]>([]);
  protected readonly receiver = signal<User | null>(null);
  protected readonly receiverWishes = signal<Wish[]>([]);

  private readonly myId = computed(() => this.auth.user()?.userId ?? -1);
  protected readonly me = computed(() => this.members().find((m) => m.userId === this.myId()) ?? null);
  protected readonly owner = computed(() => this.members().find((m) => m.power >= Power.Owner) ?? null);
  protected readonly isOwner = computed(() => (this.me()?.power ?? -1) >= Power.Owner);
  protected readonly isMember = computed(() => (this.me()?.power ?? -1) >= Power.Member);
  protected readonly canAddWishes = computed(() => this.isMember() && !this.list()?.archived);

  /** Eigene, nicht archivierte Wünsche, die noch nicht in der Liste sind */
  protected readonly addable = computed(() => {
    const inList = new Set(this.groups().flatMap((g) => g.wishes.map((w) => w.wishId)));
    return this.myWishes().filter((w) => !w.archived && !inList.has(w.wishId));
  });

  ngOnInit() {
    this.load();
  }

  private get eventId() {
    return Number(this.id());
  }

  private async load() {
    try {
      const [list, members] = await Promise.all([this.api.getList(this.eventId), this.api.getMembers(this.eventId)]);
      this.list.set(list);
      this.members.set(members);
      if (!list) return;
      this.pageTitle.set(list.eventTitle);
      if (list.eventType === ListType.Private && !this.me()) return;
      await Promise.all([this.loadWishes(), this.loadSanta(), this.loadMyWishes()]);
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  /** Alle Wünsche der Liste laden und je Person gruppieren */
  private async loadWishes() {
    const list = this.list()!;
    const all = await this.api.getWishesOfList(this.eventId);
    const me = this.myId();
    const userIds = [...new Set(all.map((w) => w.userId))];

    const groups: WishGroup[] = [];
    // Beim Wichteln sieht man in der Liste nur die eigenen Wünsche
    const visibleIds = list.eventType === ListType.SecretSanta ? userIds.filter((id) => id === me) : userIds;

    for (const uid of visibleIds) {
      const own = uid === me;
      const base = all.filter((w) => w.userId === uid);
      const wishes = own ? base : await this.withClaims(uid, base);
      const user = this.members().find((m) => m.userId === uid) ?? (own ? this.auth.user()! : null);
      if (!user) continue;
      groups.push({ user, own, wishes: this.sortWishes(wishes) });
    }
    // Eigene Wünsche zuerst, dann der Besitzer, dann der Rest
    groups.sort((a, b) => Number(b.own) - Number(a.own) || (b.user as Member).power - (a.user as Member).power);
    if (this.isMember() && !groups.some((g) => g.own)) {
      groups.unshift({ user: this.auth.user()!, own: true, wishes: [] });
    }
    this.groups.set(groups);
  }

  /** getWishesClaimed liefert keine Bilder, daher mit den Basisdaten zusammenführen */
  private async withClaims(userId: number, base: Wish[]): Promise<Wish[]> {
    const claimed = await this.api.getWishesClaimed(userId, this.eventId);
    const byId = new Map(claimed.map((c) => [c.wishId, c]));
    return base.map((w) => ({
      ...w,
      totalClaimed: byId.get(w.wishId)?.totalClaimed ?? 0,
      claimedByUser: byId.get(w.wishId)?.claimedByUser ?? 0,
    }));
  }

  private sortWishes(wishes: Wish[]) {
    return [...wishes].sort((a, b) => Number(a.archived) - Number(b.archived) || b.date.localeCompare(a.date));
  }

  private async loadSanta() {
    const list = this.list()!;
    if (list.eventType !== ListType.SecretSanta || !list.santaGenerated || !this.me()) return;
    const r = await this.api.getMySantaReceiver(this.eventId);
    this.receiver.set(r);
    if (r) {
      const base = await this.api.getWishesOfList(this.eventId, r.userId);
      this.receiverWishes.set(this.sortWishes(await this.withClaims(r.userId, base)));
    }
  }

  private async loadMyWishes() {
    if (!this.isMember()) return;
    this.myWishes.set(await this.api.getWishesOfUser(this.myId()));
  }

  private async reloadMembers() {
    this.members.set(await this.api.getMembers(this.eventId));
  }

  protected roleLabel(m: Member) {
    if (m.power >= Power.Owner) return 'role.owner';
    if (this.list()?.eventType === ListType.SecretSanta) return 'role.participant';
    if (m.power >= Power.Member) return 'role.member';
    return 'role.follower';
  }

  // ---------- Aktionen ----------

  private async run(fn: () => Promise<unknown>, success?: string) {
    this.busy.set(true);
    try {
      await fn();
      if (success) this.toast.success(success);
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected claim(w: Wish) {
    return this.run(async () => {
      await this.api.claimWish(w.wishId, 1);
      await Promise.all([this.loadWishes(), this.loadSanta()]);
    }, this.i18n.t('claim.done'));
  }

  protected unclaim(w: Wish) {
    return this.run(async () => {
      await this.api.editClaim(w.wishId, 0);
      await Promise.all([this.loadWishes(), this.loadSanta()]);
    }, this.i18n.t('claim.undone'));
  }

  protected async addToList(w: Wish) {
    this.adding.set(w.wishId);
    try {
      await this.api.addWishToList(this.eventId, w.wishId);
      await this.loadWishes();
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.adding.set(null);
    }
  }

  protected removeFromList(w: Wish) {
    return this.run(async () => {
      await this.api.removeWishFromList(this.eventId, w.wishId);
      await this.loadWishes();
    });
  }

  protected follow() {
    return this.run(async () => {
      await this.api.addMember(this.eventId, this.myId(), Power.Follower);
      await this.reloadMembers();
    }, this.i18n.t('list.followed'));
  }

  protected unfollow() {
    return this.run(async () => {
      await this.api.removeMember(this.eventId, this.myId());
      await this.reloadMembers();
    });
  }

  protected toggleNotify() {
    const notify = !this.me()!.notify;
    return this.run(
      async () => {
        await this.api.setMemberNotify(this.eventId, this.myId(), notify);
        await this.reloadMembers();
      },
      this.i18n.t(notify ? 'list.subscribed' : 'list.unsubscribed'),
    );
  }

  protected async share() {
    const url = `${location.origin}${location.pathname}#/event/${this.eventId}`;
    const title = this.list()?.eventTitle ?? '';
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      this.toast.success(this.i18n.t('list.linkCopied'));
    } catch {
      /* Teilen abgebrochen */
    }
  }

  protected readonly typeMeta = LIST_TYPE_META;
}
