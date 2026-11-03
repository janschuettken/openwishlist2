import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { I18n, TPipe } from '../../core/i18n';
import { ToastService } from '../../core/ui.services';
import { Spinner } from '../../shared/ui';
import { AuthFrame } from './auth-frame';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthFrame, RouterLink, TPipe, Spinner],
  template: `
    <app-auth-frame [title]="'auth.reset.title' | t" [subtitle]="'auth.reset.subtitle' | t">
      @if (!resetCode()) {
        <p class="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{{ 'auth.reset.noCode' | t }}</p>
      } @else {
        <form class="space-y-4" (submit)="$event.preventDefault(); submit(pw.value, pw2.value)">
          <div>
            <label class="label" for="pw">{{ 'auth.newPassword' | t }}</label>
            <input #pw id="pw" type="password" class="input" autocomplete="new-password" required />
            <p class="muted mt-1 text-xs">{{ 'auth.passwordHint' | t }}</p>
          </div>
          <div>
            <label class="label" for="pw2">{{ 'auth.repeatPassword' | t }}</label>
            <input #pw2 id="pw2" type="password" class="input" autocomplete="new-password" required />
          </div>
          <button type="submit" class="btn btn-primary w-full" [disabled]="busy()">
            @if (busy()) {
              <app-spinner />
            }
            {{ 'auth.reset.save' | t }}
          </button>
        </form>
      }
      <p class="mt-8 text-center text-sm">
        <a routerLink="/login" class="link">{{ 'auth.backToLogin' | t }}</a>
      </p>
    </app-auth-frame>
  `,
})
export default class ResetPasswordPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18n);

  readonly resetCode = input<string>();
  protected readonly busy = signal(false);

  protected async submit(pw: string, pw2: string) {
    if (pw.length < 6) {
      this.toast.error(this.i18n.t('auth.passwordHint'));
      return;
    }
    if (pw !== pw2) {
      this.toast.error(this.i18n.t('auth.reset.mismatch'));
      return;
    }
    this.busy.set(true);
    try {
      await this.api.resetPassword(this.resetCode()!, pw);
      this.toast.success(this.i18n.t('auth.reset.done'));
      await this.router.navigate(['/login']);
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
