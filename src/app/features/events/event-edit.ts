import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthStore } from '../../core/auth.store';
import { I18n, TPipe } from '../../core/i18n';
import { ListType, Member, Power, User, WishList, emptyList, fullName } from '../../core/models';
import { ConfirmService, PageTitle, ToastService } from '../../core/ui.services';
import { Icon } from '../../shared/icon';
import { LIST_TYPE_META, Loading, PageHeader, Spinner, UserRow } from '../../shared/ui';
import { UserSearch } from '../../shared/user-search';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, Icon, PageHeader, Loading, Spinner, UserRow, UserSearch],
  template: `
    <app-page-header [title]="(isNew() ? 'lists.new' : 'list.edit') | t" [back]="true" />

    @if (loading()) {
      <app-loading />
    } @else {
      <div class="grid gap-6 lg:grid-cols-2 lg:items-start">
        <!-- Stammdaten -->
        <form class="card space-y-5 p-5 lg:p-6" (submit)="$event.preventDefault(); save()">
          <div>
            <label class="label" for="title">{{ 'list.title' | t }} *</label>
            <input id="title" class="input" [placeholder]="'list.title.placeholder' | t" [value]="l().eventTitle" (input)="patch({ eventTitle: val($event) })" maxlength="120" required />
          </div>

          <fieldset>
            <legend class="label">{{ 'list.type' | t }}</legend>
            <div class="grid gap-2 sm:grid-cols-2">
              @for (t of types; track t) {
                <label
                  class="flex cursor-pointer gap-3 rounded-xl p-3 ring-1 transition"
                  [class]="l().eventType === t ? 'bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-900/30' : 'ring-slate-200 hover:bg-slate-50 dark:ring-slate-700 dark:hover:bg-slate-800'"
                >
                  <input type="radio" name="type" class="sr-only" [checked]="l().eventType === t" (change)="patch({ eventType: t })" [disabled]="!isNew() && l().santaGenerated" />
                  <app-icon [name]="meta[t].icon" class="mt-0.5 text-brand-600 dark:text-brand-400" />
                  <span>
                    <span class="block text-sm font-medium">{{ meta[t].key | t }}</span>
                    <span class="muted block text-xs">{{ meta[t].hint | t }}</span>
                  </span>
                </label>
              }
            </div>
          </fieldset>

          <div>
            <label class="label" for="deadline">{{ 'list.deadline' | t }}</label>
            <input id="deadline" type="date" class="input" [value]="dateValue()" (input)="patch({ deadline: val($event) || null })" />
          </div>

          <div>
            <label class="label" for="desc">{{ 'list.description' | t }}</label>
            <textarea id="desc" rows="4" class="input resize-y" [placeholder]="'list.description.placeholder' | t" [value]="l().eventDescription" (input)="patch({ eventDescription: val($event) })"></textarea>
          </div>

          <div class="flex justify-end pt-2">
            <button type="submit" class="btn btn-primary w-full sm:w-auto" [disabled]="busy()">
              @if (busy()) {
                <app-spinner />
              }
              {{ (isNew() ? 'list.create' : 'common.save') | t }}
            </button>
          </div>
        </form>

        @if (!isNew()) {
          <div class="space-y-6">
            <!-- Wichteln -->
            @if (l().eventType === ListType.SecretSanta) {
              <section class="card p-5 lg:p-6">
                <h2 class="flex items-center gap-2 text-lg"><app-icon name="sparkles" class="text-rose-500" />{{ 'santa.title' | t }}</h2>
                @if (l().santaGenerated) {
                  <p class="muted mt-2 text-sm">{{ 'santa.generated' | t }}</p>
                  <button type="button" class="btn btn-secondary mt-4" (click)="resetSanta()" [disabled]="busy()">
                    <app-icon name="undo" [size]="18" />{{ 'santa.reset' | t }}
                  </button>
                } @else {
                  <p class="muted mt-2 text-sm">{{ 'santa.startHint' | t: { count: members().length } }}</p>
                  <button type="button" class="btn btn-primary mt-4" (click)="startSanta()" [disabled]="busy() || members().length < 2">
                    <app-icon name="sparkles" [size]="18" />{{ 'santa.start' | t }}
                  </button>
                  @if (withoutWishes().length) {
                    <div class="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                      <p class="font-medium">{{ 'santa.withoutWishes' | t: { count: withoutWishes().length } }}</p>
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        @for (m of withoutWishes(); track m.userId) {
                          <span class="chip bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">{{ name(m) }}</span>
                        }
                      </div>
                    </div>
                  }
                }
              </section>
            }

            <!-- Mitglieder -->
            @if (l().eventType !== ListType.Private) {
              <section class="card p-5 lg:p-6">
                <h2 class="text-lg">{{ 'list.members' | t }}</h2>
                <p class="muted mt-1 text-sm">{{ membersHint() | t }}</p>
                <div class="mt-4">
                  <app-user-search [excludeIds]="memberIds()" (selected)="addMember($event)" />
                </div>
                <ul class="mt-4 space-y-3">
                  @for (m of members(); track m.userId) {
                    <li>
                      <app-user-row [user]="m" [size]="36">
                        @if (m.power >= Power.Owner) {
                          <span class="chip bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{{ 'role.owner' | t }}</span>
                        } @else {
                          @if (l().eventType !== ListType.SecretSanta) {
                            <select
                              class="max-w-36 rounded-lg border-0 bg-slate-100 py-1.5 pr-7 pl-2 text-xs text-slate-700 focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-200"
                              (change)="setPower(m, val($event))"
                              [attr.aria-label]="'list.role' | t"
                            >
                              <option [value]="Power.Follower" [selected]="m.power < Power.Member">{{ 'role.follower' | t }}</option>
                              <option [value]="Power.Member" [selected]="m.power >= Power.Member">{{ 'role.member' | t }}</option>
                            </select>
                          }
                          <button type="button" class="btn btn-ghost p-1.5 text-rose-600 dark:text-rose-400" (click)="removeMember(m)" [title]="'common.remove' | t">
                            <app-icon name="user-minus" [size]="18" />
                          </button>
                        }
                      </app-user-row>
                    </li>
                  }
                </ul>
              </section>
            }

            <!-- Archivieren / Löschen -->
            <section class="card p-5 lg:p-6">
              <h2 class="text-lg">{{ 'list.manage' | t }}</h2>
              <div class="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" class="btn btn-secondary" (click)="toggleArchive()" [disabled]="busy()">
                  <app-icon [name]="l().archived ? 'undo' : 'archive'" [size]="18" />
                  {{ (l().archived ? 'list.unarchive' : 'list.archive') | t }}
                </button>
                <button type="button" class="btn btn-ghost text-rose-600 dark:text-rose-400" (click)="remove()" [disabled]="busy()">
                  <app-icon name="trash" [size]="18" />{{ 'list.delete' | t }}
                </button>
              </div>
              @if (!l().archived) {
                <p class="muted mt-3 text-xs">{{ 'list.archive.hint' | t }}</p>
              }
            </section>
          </div>
        }
      </div>
    }
  `,
})
export default class EventEditPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly i18n = inject(I18n);
  private readonly pageTitle = inject(PageTitle);

  readonly id = input<string>();

  protected readonly ListType = ListType;
  protected readonly Power = Power;
  protected readonly meta = LIST_TYPE_META;
  protected readonly types = [ListType.Public, ListType.Shared, ListType.SecretSanta, ListType.Private];

  protected readonly l = signal<WishList>(emptyList());
  protected readonly members = signal<Member[]>([]);
  /** userIds, die mindestens einen Wunsch in der Liste haben */
  private readonly usersWithWishes = signal<Set<number>>(new Set());
  protected readonly withoutWishes = computed(() => this.members().filter((m) => !this.usersWithWishes().has(m.userId)));
  protected readonly name = fullName;
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly isNew = computed(() => !this.id() || Number(this.id()) <= 0);
  protected readonly memberIds = computed(() => this.members().map((m) => m.userId));
  protected readonly dateValue = computed(() => this.l().deadline?.slice(0, 10) ?? '');
  protected readonly membersHint = computed(() =>
    this.l().eventType === ListType.SecretSanta ? 'list.members.hint.santa' : 'list.members.hint',
  );

  async ngOnInit() {
    this.pageTitle.set(this.i18n.t(this.isNew() ? 'lists.new' : 'list.edit'));
    if (this.isNew()) {
      this.patch({ eventType: ListType.Public });
      return;
    }
    this.loading.set(true);
    try {
      const [list, members] = await Promise.all([this.api.getList(this.eventId), this.api.getMembers(this.eventId)]);
      const me = members.find((m) => m.userId === this.auth.user()?.userId);
      if (!list || (me?.power ?? 0) < Power.Owner) {
        this.toast.error(this.i18n.t('list.noPermission'));
        await this.router.navigate(['/event', this.eventId]);
        return;
      }
      this.l.set(list);
      this.members.set(this.sortMembers(members));
      if (list.eventType === ListType.SecretSanta && !list.santaGenerated) await this.loadListWishes();
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  private get eventId() {
    return Number(this.id());
  }

  protected val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  protected patch(p: Partial<WishList>) {
    this.l.update((l) => ({ ...l, ...p }));
  }

  private sortMembers(members: Member[]) {
    return [...members].sort((a, b) => b.power - a.power || fullName(a).localeCompare(fullName(b)));
  }

  private async reloadMembers() {
    this.members.set(this.sortMembers(await this.api.getMembers(this.eventId)));
  }

  private async loadListWishes() {
    const wishes = await this.api.getWishesOfList(this.eventId);
    this.usersWithWishes.set(new Set(wishes.map((w) => w.userId)));
  }

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

  protected save() {
    const l = this.l();
    if (l.eventTitle.trim().length < 3) {
      this.toast.error(this.i18n.t('list.titleRequired'));
      return;
    }
    return this.run(async () => {
      const data = { ...l, eventTitle: l.eventTitle.trim() };
      if (this.isNew()) {
        const { eventId } = await this.api.addList(data);
        this.toast.success(this.i18n.t('list.created'));
        await this.router.navigate(['/event', eventId], { replaceUrl: true });
      } else {
        await this.api.editList(data);
        this.toast.success(this.i18n.t('common.saved'));
        await this.router.navigate(['/event', this.eventId]);
      }
    });
  }

  /** Neue Mitglieder: beim Wichteln als Teilnehmer, sonst als Follower (sehen und verschenken) */
  protected addMember(u: User) {
    const power = this.l().eventType === ListType.SecretSanta ? Power.Member : Power.Follower;
    return this.run(async () => {
      await this.api.addMember(this.eventId, u.userId, power);
      await this.reloadMembers();
    }, this.i18n.t('list.memberAdded', { name: u.firstName }));
  }

  protected setPower(m: Member, value: string) {
    return this.run(async () => {
      await this.api.setMemberPower(this.eventId, m.userId, Number(value));
      await this.reloadMembers();
    }, this.i18n.t('common.saved'));
  }

  protected async removeMember(m: Member) {
    if (!(await this.confirm.ask(this.i18n.t('list.removeMember.confirm', { name: fullName(m) }), { confirmLabel: this.i18n.t('common.remove') }))) return;
    await this.run(async () => {
      await this.api.removeMember(this.eventId, m.userId);
      await this.reloadMembers();
    });
  }

  protected async startSanta() {
    // Frisch laden, falls inzwischen jemand Wünsche eingetragen hat.
    await this.loadListWishes().catch(() => {});
    const without = this.withoutWishes();
    const ok = without.length
      ? await this.confirm.ask(this.i18n.t('santa.force.confirm'), {
          text: this.i18n.t('santa.missingWishes', { names: without.map((m) => fullName(m)).join(', ') }),
          confirmLabel: this.i18n.t('santa.force'),
          danger: false,
        })
      : await this.confirm.ask(this.i18n.t('santa.start.confirm'), { text: this.i18n.t('santa.start.text'), confirmLabel: this.i18n.t('santa.start'), danger: false });
    if (!ok) return;
    await this.run(async () => {
      await this.api.generateSecretSanta(this.eventId);
      this.patch({ santaGenerated: true });
    }, this.i18n.t('santa.started'));
  }

  protected async resetSanta() {
    if (!(await this.confirm.ask(this.i18n.t('santa.reset.confirm'), { text: this.i18n.t('santa.reset.text'), confirmLabel: this.i18n.t('santa.reset') }))) return;
    await this.run(async () => {
      await this.api.resetSecretSanta(this.eventId);
      this.patch({ santaGenerated: false });
    }, this.i18n.t('santa.wasReset'));
  }

  protected async toggleArchive() {
    const archived = !this.l().archived;
    if (archived && !(await this.confirm.ask(this.i18n.t('list.archive.confirm'), { text: this.i18n.t('list.archive.hint'), confirmLabel: this.i18n.t('list.archive'), danger: false }))) return;
    await this.run(async () => {
      await this.api.editList({ ...this.l(), archived });
      this.patch({ archived });
    }, this.i18n.t(archived ? 'list.archived' : 'list.unarchived'));
  }

  protected async remove() {
    if (!(await this.confirm.ask(this.i18n.t('list.delete.confirm'), { text: this.i18n.t('list.delete.text'), confirmLabel: this.i18n.t('common.delete') }))) return;
    await this.run(async () => {
      await this.api.deleteList(this.eventId);
      this.toast.success(this.i18n.t('list.deleted'));
      await this.router.navigate(['/events'], { replaceUrl: true });
    });
  }
}
