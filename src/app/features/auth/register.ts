import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth.store';
import { I18n, TPipe } from '../../core/i18n';
import { ToastService } from '../../core/ui.services';
import { Spinner } from '../../shared/ui';
import { AuthFrame } from './auth-frame';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthFrame, RouterLink, TPipe, Spinner],
  template: `
    <app-auth-frame [title]="'auth.register.title' | t" [subtitle]="'auth.register.subtitle' | t">
      <form class="space-y-4" (submit)="$event.preventDefault(); submit(first.value, last.value, email.value, password.value)">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label" for="first">{{ 'auth.firstName' | t }}</label>
            <input #first id="first" class="input" autocomplete="given-name" required />
          </div>
          <div>
            <label class="label" for="last">{{ 'auth.lastName' | t }}</label>
            <input #last id="last" class="input" autocomplete="family-name" required />
          </div>
        </div>
        <div>
          <label class="label" for="email">{{ 'auth.email' | t }}</label>
          <input #email id="email" type="email" class="input" autocomplete="email" required />
        </div>
        <div>
          <label class="label" for="password">{{ 'auth.password' | t }}</label>
          <input #password id="password" type="password" class="input" autocomplete="new-password" minlength="6" required />
          <p class="muted mt-1 text-xs">{{ 'auth.passwordHint' | t }}</p>
        </div>
        <button type="submit" class="btn btn-primary w-full" [disabled]="busy()">
          @if (busy()) {
            <app-spinner />
          }
          {{ 'auth.register' | t }}
        </button>
      </form>
      <p class="muted mt-8 text-center text-sm">
        {{ 'auth.haveAccount' | t }}
        <a routerLink="/login" class="link">{{ 'auth.login' | t }}</a>
      </p>
    </app-auth-frame>
  `,
})
export default class RegisterPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18n);
  protected readonly busy = signal(false);

  protected async submit(firstName: string, lastName: string, email: string, password: string) {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      this.toast.error(this.i18n.t('form.required'));
      return;
    }
    if (password.length < 6) {
      this.toast.error(this.i18n.t('auth.passwordHint'));
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.register({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password });
      this.toast.success(this.i18n.t('auth.welcome', { name: firstName.trim() }));
      await this.router.navigate(['/home']);
    } catch (e) {
      this.toast.error(e instanceof Error && e.message.includes('Duplicate') ? this.i18n.t('auth.emailTaken') : e);
    } finally {
      this.busy.set(false);
    }
  }
}
