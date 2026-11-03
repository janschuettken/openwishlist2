import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../core/auth.store';
import { TKey, TPipe } from '../core/i18n';
import { fullName } from '../core/models';
import { ThemeService } from '../core/ui.services';
import { Icon, IconName } from '../shared/icon';
import { Avatar } from '../shared/ui';

interface NavItem {
  path: string;
  label: TKey;
  short: TKey;
  icon: IconName;
  admin?: boolean;
}

const NAV: NavItem[] = [
  { path: '/home', label: 'nav.home', short: 'nav.home', icon: 'home' },
  { path: '/wishes', label: 'nav.wishes', short: 'nav.wishes.short', icon: 'gift' },
  { path: '/events', label: 'nav.lists', short: 'nav.lists.short', icon: 'list' },
  { path: '/following', label: 'nav.following', short: 'nav.following.short', icon: 'users' },
  { path: '/admin', label: 'nav.admin', short: 'nav.admin', icon: 'shield', admin: true },
];

/**
 * App-Rahmen: Auf dem Desktop eine feste Sidebar, auf dem Handy
 * eine kompakte Kopfzeile plus Tab-Leiste unten (daumenfreundlich).
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Avatar, TPipe],
  template: `
    @if (auth.impersonating()) {
      <div class="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-400 px-4 py-1.5 text-sm font-medium text-amber-950 pt-safe">
        <app-icon name="shield" [size]="16" />
        {{ 'admin.impersonating' | t: { name: userName() } }}
        <button type="button" class="rounded-lg bg-amber-950/10 px-2 py-0.5 hover:bg-amber-950/20" (click)="auth.backToAdmin()">
          {{ 'admin.back' | t }}
        </button>
      </div>
    }

    <!-- Desktop: Sidebar -->
    <aside class="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white/80 backdrop-blur lg:flex dark:border-slate-800 dark:bg-slate-900/80">
      <a routerLink="/home" class="flex items-center gap-3 px-6 py-6">
        <img src="logo.png" alt="" class="size-10" />
        <span class="text-lg font-bold tracking-tight">Open Wishlist</span>
      </a>
      <nav class="flex-1 space-y-1 px-3">
        @for (item of nav(); track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="!bg-brand-50 !text-brand-700 dark:!bg-brand-900/40 dark:!text-brand-300"
            class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <app-icon [name]="item.icon" />
            {{ item.label | t }}
          </a>
        }
      </nav>
      <div class="border-t border-slate-200 p-3 dark:border-slate-800">
        <a
          routerLink="/profile"
          routerLinkActive="bg-slate-100 dark:bg-slate-800"
          class="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <app-avatar [user]="auth.user()" [size]="36" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{{ userName() }}</span>
            <span class="muted block text-xs">{{ 'nav.profile' | t }}</span>
          </span>
          <app-icon name="settings" [size]="18" class="text-slate-400" />
        </a>
        <button type="button" class="btn btn-ghost mt-1 w-full justify-start" (click)="cycleTheme()">
          <app-icon [name]="themeIcon()" [size]="18" />
          {{ themeLabel() | t }}
        </button>
      </div>
    </aside>

    <!-- Mobil: Kopfzeile -->
    <header class="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur pt-safe lg:hidden dark:border-slate-800 dark:bg-slate-900/85">
      <div class="flex h-14 items-center gap-3 px-4">
        <a routerLink="/home" class="flex items-center gap-2">
          <img src="logo.png" alt="" class="size-8" />
          <span class="font-bold tracking-tight">Open Wishlist</span>
        </a>
        <a routerLink="/profile" class="ml-auto" [attr.aria-label]="'nav.profile' | t">
          <app-avatar [user]="auth.user()" [size]="34" />
        </a>
      </div>
    </header>

    <main class="lg:pl-64">
      <div class="mx-auto w-full max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
        <router-outlet />
      </div>
    </main>

    <!-- Mobil: Tab-Leiste -->
    <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur pb-safe lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
      <div class="mx-auto flex max-w-lg">
        @for (item of mobileNav(); track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="!text-brand-600 dark:!text-brand-400 [&_.pill]:bg-brand-100 dark:[&_.pill]:bg-brand-900/50"
            class="flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
          >
            <span class="pill flex h-7 w-14 items-center justify-center rounded-full transition">
              <app-icon [name]="item.icon" [size]="22" />
            </span>
            {{ item.short | t }}
          </a>
        }
      </div>
    </nav>
  `,
})
export class Shell {
  protected readonly auth = inject(AuthStore);
  private readonly theme = inject(ThemeService);

  protected readonly userName = computed(() => fullName(this.auth.user()));
  protected readonly nav = computed(() => NAV.filter((n) => !n.admin || this.auth.isAdmin()));
  protected readonly mobileNav = computed(() => NAV.filter((n) => !n.admin));

  protected readonly themeIcon = computed<IconName>(() => {
    const m = this.theme.mode();
    return m === 'dark' ? 'moon' : m === 'light' ? 'sun' : 'monitor';
  });
  protected readonly themeLabel = computed<TKey>(() => `theme.${this.theme.mode()}` as TKey);

  protected cycleTheme() {
    const order = ['system', 'light', 'dark'] as const;
    this.theme.set(order[(order.indexOf(this.theme.mode()) + 1) % order.length]);
  }
}
