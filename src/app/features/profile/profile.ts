import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AuthStore } from '../../core/auth.store';
import { I18n, Lang, TKey, TPipe } from '../../core/i18n';
import { PageTitle, ThemeMode, ThemeService, ToastService } from '../../core/ui.services';
import { Icon, IconName } from '../../shared/icon';
import { Avatar, PageHeader, Spinner } from '../../shared/ui';
import { AvatarPicker } from './avatar-picker';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, Icon, Avatar, PageHeader, Spinner, AvatarPicker],
  template: `
    <app-page-header [title]="'nav.profile' | t" />

    @if (auth.user(); as u) {
      <div class="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <!-- Profilbild -->
        <section class="card flex flex-col items-center gap-4 p-6 text-center">
          @if (!picking()) {
            <app-avatar [user]="u" [size]="120" [large]="true" />
            <div>
              <p class="text-lg font-semibold">{{ u.firstName }} {{ u.lastName }}</p>
              <p class="muted text-sm">{{ u.email }}</p>
            </div>
          }
          <app-avatar-picker (picked)="upload($event)" />
        </section>

        <div class="space-y-6">
          <!-- Stammdaten -->
          <form class="card space-y-4 p-5 lg:p-6" (submit)="$event.preventDefault(); save(first.value, last.value, email.value)">
            <h2 class="text-lg">{{ 'profile.data' | t }}</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="first">{{ 'auth.firstName' | t }}</label>
                <input #first id="first" class="input" [value]="u.firstName" autocomplete="given-name" />
              </div>
              <div>
                <label class="label" for="last">{{ 'auth.lastName' | t }}</label>
                <input #last id="last" class="input" [value]="u.lastName" autocomplete="family-name" />
              </div>
            </div>
            <div>
              <label class="label" for="email">{{ 'auth.email' | t }}</label>
              <input #email id="email" type="email" class="input" [value]="u.email ?? ''" autocomplete="email" />
            </div>
            <div class="flex justify-end">
              <button type="submit" class="btn btn-primary" [disabled]="busy()">
                @if (busy()) {
                  <app-spinner />
                }
                {{ 'common.save' | t }}
              </button>
            </div>
          </form>

          <!-- Passwort ändern -->
          <form #pwForm class="card space-y-4 p-5 lg:p-6" (submit)="$event.preventDefault(); changePassword(oldPw.value, newPw.value, newPw2.value, pwForm)">
            <h2 class="text-lg">{{ 'profile.password' | t }}</h2>
            <input type="email" class="hidden" autocomplete="username" [value]="u.email ?? ''" />
            <div>
              <label class="label" for="oldPw">{{ 'profile.password.current' | t }}</label>
              <input #oldPw id="oldPw" type="password" class="input" autocomplete="current-password" required />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="newPw">{{ 'auth.newPassword' | t }}</label>
                <input #newPw id="newPw" type="password" class="input" autocomplete="new-password" required />
              </div>
              <div>
                <label class="label" for="newPw2">{{ 'auth.repeatPassword' | t }}</label>
                <input #newPw2 id="newPw2" type="password" class="input" autocomplete="new-password" required />
              </div>
            </div>
            <p class="muted text-xs">{{ 'auth.passwordHint' | t }}</p>
            <div class="flex justify-end">
              <button type="submit" class="btn btn-primary" [disabled]="pwBusy()">
                @if (pwBusy()) {
                  <app-spinner />
                }
                {{ 'profile.password.save' | t }}
              </button>
            </div>
          </form>

          <!-- Einstellungen -->
          <section class="card space-y-5 p-5 lg:p-6">
            <h2 class="text-lg">{{ 'profile.settings' | t }}</h2>
            <div>
              <p class="label">{{ 'profile.theme' | t }}</p>
              <div class="grid grid-cols-3 gap-2">
                @for (m of themes; track m.mode) {
                  <button type="button" class="btn btn-secondary flex-col gap-1 py-3" [class]="theme.mode() === m.mode ? '!ring-2 !ring-brand-500' : ''" (click)="theme.set(m.mode)">
                    <app-icon [name]="m.icon" />
                    <span class="text-xs">{{ m.label | t }}</span>
                  </button>
                }
              </div>
            </div>
            <div>
              <p class="label">{{ 'profile.language' | t }}</p>
              <div class="grid grid-cols-2 gap-2">
                @for (l of langs; track l.code) {
                  <button type="button" class="btn btn-secondary" [class]="i18n.lang() === l.code ? '!ring-2 !ring-brand-500' : ''" (click)="i18n.setLang(l.code)">
                    {{ l.label }}
                  </button>
                }
              </div>
            </div>
          </section>

          <button type="button" class="btn btn-secondary w-full text-rose-600 sm:w-auto dark:text-rose-400" (click)="auth.logout()">
            <app-icon name="logout" [size]="18" />{{ 'auth.logout' | t }}
          </button>
        </div>
      </div>
    }
  `,
})
export default class ProfilePage {
  protected readonly auth = inject(AuthStore);
  protected readonly theme = inject(ThemeService);
  protected readonly i18n = inject(I18n);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly picker = viewChild(AvatarPicker);

  protected readonly busy = signal(false);
  protected readonly pwBusy = signal(false);
  protected readonly picking = computed(() => this.picker()?.active() ?? false);

  protected readonly themes: { mode: ThemeMode; icon: IconName; label: TKey }[] = [
    { mode: 'system', icon: 'monitor', label: 'theme.system' },
    { mode: 'light', icon: 'sun', label: 'theme.light' },
    { mode: 'dark', icon: 'moon', label: 'theme.dark' },
  ];
  protected readonly langs: { code: Lang; label: string }[] = [
    { code: 'de', label: 'Deutsch' },
    { code: 'en', label: 'English' },
  ];

  constructor() {
    inject(PageTitle).set(this.i18n.t('nav.profile'));
  }

  protected async save(firstName: string, lastName: string, email: string) {
    const u = this.auth.user()!;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      this.toast.error(this.i18n.t('form.required'));
      return;
    }
    this.busy.set(true);
    try {
      await this.api.editUser({ userId: u.userId, firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() });
      await this.auth.refresh();
      this.toast.success(this.i18n.t('common.saved'));
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected async changePassword(oldPw: string, newPw: string, newPw2: string, form: HTMLFormElement) {
    if (newPw.length < 6) {
      this.toast.error(this.i18n.t('auth.passwordHint'));
      return;
    }
    if (newPw !== newPw2) {
      this.toast.error(this.i18n.t('auth.reset.mismatch'));
      return;
    }
    this.pwBusy.set(true);
    try {
      await this.api.changePassword(oldPw, newPw);
      form.reset();
      this.toast.success(this.i18n.t('profile.password.saved'));
    } catch (e) {
      this.toast.error(e instanceof Error && e.message === 'Wrong password' ? this.i18n.t('profile.password.wrong') : e);
    } finally {
      this.pwBusy.set(false);
    }
  }

  protected async upload(file: File) {
    const picker = this.picker()!;
    picker.uploading.set(true);
    try {
      await this.api.uploadUserImage(file);
      await this.auth.refresh();
      picker.done();
      this.toast.success(this.i18n.t('profile.imageSaved'));
    } catch (e) {
      this.toast.error(e);
    } finally {
      picker.uploading.set(false);
    }
  }
}
