import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
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
    <app-auth-frame [title]="'auth.login.title' | t" [subtitle]="'auth.login.subtitle' | t">
      <form class="space-y-4" (submit)="$event.preventDefault(); submit(email.value, password.value)">
        <div>
          <label class="label" for="email">{{ 'auth.email' | t }}</label>
          <input #email id="email" type="email" class="input" autocomplete="username" required />
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label class="label" for="password">{{ 'auth.password' | t }}</label>
            <a routerLink="/forgot-password" class="link mb-1.5 text-xs">{{ 'auth.forgot' | t }}</a>
          </div>
          <input #password id="password" type="password" class="input" autocomplete="current-password" required />
        </div>
        <button type="submit" class="btn btn-primary w-full" [disabled]="busy()">
          @if (busy()) {
            <app-spinner />
          }
          {{ 'auth.login' | t }}
        </button>
      </form>
      <p class="muted mt-8 text-center text-sm">
        {{ 'auth.noAccount' | t }}
        <a routerLink="/register" class="link">{{ 'auth.register' | t }}</a>
      </p>
    </app-auth-frame>
  `,
})
export default class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18n);

  readonly next = input<string>();
  protected readonly busy = signal(false);

  protected async submit(email: string, password: string) {
    if (!email || !password) {
      this.toast.error(this.i18n.t('form.required'));
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.login(email.trim(), password);
      await this.router.navigateByUrl(this.next() || '/home');
    } catch (e) {
      this.toast.error(e instanceof Error && e.message === 'Invalid email or password' ? this.i18n.t('auth.invalid') : e);
    } finally {
      this.busy.set(false);
    }
  }
}
