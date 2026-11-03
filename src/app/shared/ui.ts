import { ChangeDetectionStrategy, Component, Pipe, PipeTransform, computed, inject, input, output, signal } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppDatePipe, TKey, TPipe } from '../core/i18n';
import { ListType, User, Wish, WishList, fullName, initials, isFullyClaimed, shortUrl } from '../core/models';
import { Icon, IconName } from './icon';

// ---------------- Texte mit HTML ----------------

/**
 * Beschreibungen aus der alten App enthalten teils HTML (<br>, <b>).
 * Reiner Text bekommt Zeilenumbrüche als <br>; Angular säubert das Ergebnis bei [innerHTML].
 */
@Pipe({ name: 'rich' })
export class RichTextPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    if (/<[a-z][\s\S]*>/i.test(value)) return value;
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
  }
}

/** Nur den Text ohne HTML-Tags (für einzeilige Vorschauen) */
@Pipe({ name: 'plain' })
export class PlainTextPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');
  }
}

// ---------------- Avatar ----------------

const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-teal-500',
  'bg-orange-500',
];

@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src() && !failed()) {
      <img
        [src]="src()"
        [alt]="name()"
        (error)="failed.set(true)"
        class="size-full rounded-full object-cover"
        loading="lazy"
      />
    } @else {
      <span class="flex size-full items-center justify-center rounded-full font-semibold text-white" [class]="color()">
        {{ letters() }}
      </span>
    }
  `,
  host: { class: 'inline-block shrink-0 rounded-full', '[style.width.px]': 'size()', '[style.height.px]': 'size()', '[style.fontSize.px]': 'size() * 0.38' },
})
export class Avatar {
  readonly user = input<Pick<User, 'firstName' | 'lastName' | 'imgUrl' | 'imgUrlSmall' | 'userId'> | null>(null);
  readonly size = input(40);
  readonly large = input(false);
  protected readonly failed = signal(false);
  protected readonly src = computed(() => {
    const u = this.user();
    return (this.large() ? u?.imgUrl || u?.imgUrlSmall : u?.imgUrlSmall || u?.imgUrl) ?? null;
  });
  protected readonly name = computed(() => fullName(this.user()));
  protected readonly letters = computed(() => initials(this.user()));
  protected readonly color = computed(() => AVATAR_COLORS[Math.abs(this.user()?.userId ?? 0) % AVATAR_COLORS.length]);
}

// ---------------- Spinner / Leer-Zustand / Seitenkopf ----------------

@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="inline-block animate-spin rounded-full border-2 border-current border-r-transparent"
    [style.width.px]="size()"
    [style.height.px]="size()"
  ></span>`,
  host: { class: 'inline-flex', role: 'status' },
})
export class Spinner {
  readonly size = input(18);
}

@Component({
  selector: 'app-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Spinner],
  template: `<div class="flex justify-center py-16 text-brand-500"><app-spinner [size]="28" /></div>`,
})
export class Loading {}

@Component({
  selector: 'app-empty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-800">
      <span class="mb-3 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        <app-icon [name]="icon()" [size]="24" />
      </span>
      <p class="font-medium">{{ title() }}</p>
      @if (text()) {
        <p class="muted mt-1 max-w-sm text-sm">{{ text() }}</p>
      }
      <div class="mt-4 empty:hidden"><ng-content /></div>
    </div>
  `,
})
export class EmptyState {
  readonly icon = input<IconName>('gift');
  readonly title = input.required<string>();
  readonly text = input<string>('');
}

/** Seitenkopf mit optionalem Zurück-Button und Aktionen rechts */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="mb-6 flex items-start gap-3">
      @if (back()) {
        <button type="button" class="btn btn-ghost -ml-2 p-2" (click)="location.back()" [attr.aria-label]="'Zurück'">
          <app-icon name="chevron-left" />
        </button>
      }
      <div class="min-w-0 flex-1">
        <h1 class="line-clamp-2 text-2xl break-words lg:text-3xl">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="muted mt-1 text-sm">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex shrink-0 items-center gap-2"><ng-content /></div>
    </div>
  `,
})
export class PageHeader {
  protected readonly location = inject(Location);
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly back = input(false);
}

// ---------------- Listentyp ----------------

export const LIST_TYPE_META: Record<ListType, { key: TKey; hint: TKey; icon: IconName; cls: string }> = {
  [ListType.Private]: {
    key: 'listType.private',
    hint: 'listType.private.hint',
    icon: 'lock',
    cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  [ListType.Public]: {
    key: 'listType.public',
    hint: 'listType.public.hint',
    icon: 'globe',
    cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  },
  [ListType.Shared]: {
    key: 'listType.shared',
    hint: 'listType.shared.hint',
    icon: 'users',
    cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  },
  [ListType.SecretSanta]: {
    key: 'listType.santa',
    hint: 'listType.santa.hint',
    icon: 'sparkles',
    cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
};

@Component({
  selector: 'app-list-type-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TPipe],
  template: `<span class="chip" [class]="meta().cls"><app-icon [name]="meta().icon" [size]="12" />{{ meta().key | t }}</span>`,
})
export class ListTypeBadge {
  readonly type = input.required<ListType>();
  protected readonly meta = computed(() => LIST_TYPE_META[this.type()] ?? LIST_TYPE_META[ListType.Private]);
}

// ---------------- Listen-Karte ----------------

@Component({
  selector: 'app-list-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, TPipe, AppDatePipe, ListTypeBadge, Avatar, PlainTextPipe],
  template: `
    <a
      [routerLink]="['/event', list().eventId]"
      class="card group flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-md lg:p-5"
      [class.opacity-60]="list().archived"
    >
      <div class="mb-3 flex items-center gap-2">
        <app-list-type-badge [type]="list().eventType" />
        @if (list().archived) {
          <span class="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{{ 'common.archived' | t }}</span>
        }
        <app-icon name="chevron-right" [size]="18" class="ml-auto text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
      </div>
      <h3 class="text-lg leading-snug text-slate-900 dark:text-slate-100">{{ list().eventTitle }}</h3>
      @if (list().eventDescription) {
        <p class="muted mt-1 line-clamp-2 text-sm">{{ list().eventDescription | plain }}</p>
      }
      <div class="mt-auto flex items-center gap-3 pt-4 text-xs">
        @if (owner(); as o) {
          <span class="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <app-avatar [user]="o" [size]="20" />{{ o.firstName }}
          </span>
        }
        @if (list().deadline) {
          <span class="muted ml-auto flex items-center gap-1">
            <app-icon name="calendar" [size]="14" />{{ list().deadline | appDate }}
          </span>
        }
      </div>
    </a>
  `,
})
export class ListCard {
  readonly list = input.required<WishList>();
  readonly owner = input<User | null>(null);
}

// ---------------- Wunsch-Karte ----------------

@Component({
  selector: 'app-wish-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TPipe, RichTextPipe],
  template: `
    <article class="card flex h-full flex-col overflow-hidden" [class.opacity-60]="wish().archived">
      <div class="flex gap-4 p-4">
        <div class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:size-24 dark:bg-slate-800">
          @if (wish().wishImgUrl && !imgFailed()) {
            <img [src]="wish().wishImgUrl" [alt]="wish().title" class="size-full object-cover" loading="lazy" (error)="imgFailed.set(true)" />
          } @else {
            <app-icon name="gift" [size]="28" class="text-slate-300 dark:text-slate-600" />
          }
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-start gap-2">
            <h3 class="min-w-0 flex-1 font-semibold leading-snug break-words">{{ wish().title }}</h3>
            @if (editable()) {
              <button type="button" class="btn btn-ghost -mt-1 -mr-2 p-1.5" (click)="edit.emit(wish())" [attr.aria-label]="'common.edit' | t">
                <app-icon name="edit" [size]="16" />
              </button>
            }
          </div>
          @if (wish().archived) {
            <span class="chip mt-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{{ 'common.archived' | t }}</span>
          }
          @if (wish().description) {
            <p class="muted mt-1 text-sm break-words" [class.line-clamp-3]="!expanded()" [innerHTML]="wish().description | rich"></p>
            @if (wish().description.length > 140) {
              <button type="button" class="link mt-0.5 text-xs" (click)="expanded.set(!expanded())">
                {{ (expanded() ? 'common.showLess' : 'common.showMore') | t }}
              </button>
            }
          }
          @if (wish().url) {
            <a [href]="wish().url" target="_blank" rel="noopener noreferrer" class="link mt-2 inline-flex items-center gap-1 text-sm">
              <app-icon name="external" [size]="14" />{{ host() }}
            </a>
          }
        </div>
      </div>
      @if (showClaim() && wish().totalClaimed !== null) {
        <div class="px-4 pb-3">
          <div class="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div class="h-full rounded-full transition-all" [class]="full() ? 'bg-emerald-500' : 'bg-brand-500'" [style.width.%]="percent()"></div>
          </div>
          <p class="muted mt-1.5 text-xs">
            @if (wish().claimedByUser > 0) {
              <span class="font-medium text-emerald-600 dark:text-emerald-400">{{ 'claim.byYou' | t }}</span>
            } @else if (full()) {
              {{ 'claim.full' | t }}
            } @else if ((wish().totalClaimed ?? 0) > 0) {
              {{ 'claim.partial' | t }}
            } @else {
              {{ 'claim.free' | t }}
            }
          </p>
        </div>
      }
      <div class="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 empty:hidden dark:border-slate-800">
        <ng-content />
      </div>
    </article>
  `,
})
export class WishCard {
  readonly wish = input.required<Wish>();
  readonly editable = input(false);
  readonly showClaim = input(false);
  readonly edit = output<Wish>();
  protected readonly expanded = signal(false);
  protected readonly imgFailed = signal(false);
  protected readonly host = computed(() => shortUrl(this.wish().url));
  protected readonly full = computed(() => isFullyClaimed(this.wish()));
  protected readonly percent = computed(() => Math.min(100, (this.wish().totalClaimed ?? 0) * 100));
}

// ---------------- Nutzer-Zeile ----------------

@Component({
  selector: 'app-user-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar],
  template: `
    <div class="flex items-center gap-3">
      <app-avatar [user]="user()" [size]="size()" />
      <div class="min-w-0 flex-1">
        <p class="truncate font-medium">{{ name() }}</p>
        @if (sub()) {
          <p class="muted truncate text-xs">{{ sub() }}</p>
        }
      </div>
      <ng-content />
    </div>
  `,
})
export class UserRow {
  readonly user = input.required<User>();
  readonly sub = input<string>('');
  readonly size = input(40);
  protected readonly name = computed(() => fullName(this.user()));
}
