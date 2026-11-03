import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { I18n, TPipe } from '../../core/i18n';
import { AuthStore } from '../../core/auth.store';
import { User } from '../../core/models';
import { PageTitle, ToastService } from '../../core/ui.services';
import { Icon } from '../../shared/icon';
import { PageHeader, UserRow } from '../../shared/ui';
import { UserSearch } from '../../shared/user-search';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, Icon, PageHeader, UserRow, UserSearch],
  template: `
    <app-page-header [title]="'nav.admin' | t" [subtitle]="'admin.subtitle' | t" />

    <section class="card max-w-xl p-5 lg:p-6">
      <h2 class="text-lg">{{ 'admin.loginAs' | t }}</h2>
      <p class="muted mt-1 text-sm">{{ 'admin.loginAs.hint' | t }}</p>
      <div class="mt-4">
        <app-user-search [adminMode]="true" [showEmail]="true" (selected)="selected.set($event)" />
      </div>
      @if (selected(); as u) {
        <div class="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <app-user-row [user]="u" [sub]="u.email ?? ''">
            <button type="button" class="btn btn-primary btn-sm" (click)="loginAs(u)" [disabled]="!u.loginToken">
              <app-icon name="login" [size]="16" />{{ 'admin.loginAs' | t }}
            </button>
          </app-user-row>
          <dl class="muted mt-3 grid grid-cols-2 gap-1 text-xs">
            <dt>ID</dt>
            <dd>{{ u.userId }} · {{ u.uniqueUserId }}</dd>
            <dt>Power</dt>
            <dd>{{ u.power }}</dd>
          </dl>
        </div>
      }
    </section>
  `,
})
export default class AdminPage {
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  protected readonly selected = signal<User | null>(null);

  constructor() {
    inject(PageTitle).set(inject(I18n).t('nav.admin'));
  }

  protected async loginAs(u: User) {
    try {
      await this.auth.impersonate(u.loginToken!);
    } catch (e) {
      this.toast.error(e);
    }
  }
}
