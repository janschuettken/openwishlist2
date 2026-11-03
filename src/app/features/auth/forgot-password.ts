import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { I18n, TPipe } from '../../core/i18n';
import { ToastService } from '../../core/ui.services';
import { Icon } from '../../shared/icon';
import { Spinner } from '../../shared/ui';
import { AuthFrame } from './auth-frame';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthFrame, RouterLink, TPipe, Spinner, Icon],
  template: `
    <app-auth-frame [title]="'auth.forgot.title' | t" [subtitle]="'auth.forgot.subtitle' | t">
      @if (sent()) {
        <div class="card flex items-start gap-3 p-4 text-sm">
          <app-icon name="check" class="text-emerald-500" />
          <p>{{ 'auth.forgot.sent' | t }}</p>
        </div>
      } @else {
        <form class="space-y-4" (submit)="$event.preventDefault(); submit(email.value)">
          <div>
            <label class="label" for="email">{{ 'auth.email' | t }}</label>
            <input #email id="email" type="email" class="input" autocomplete="email" required />
          </div>
          <button type="submit" class="btn btn-primary w-full" [disabled]="busy()">
            @if (busy()) {
              <app-spinner />
            }
            {{ 'auth.forgot.send' | t }}
          </button>
        </form>
      }
      <p class="mt-8 text-center text-sm">
        <a routerLink="/login" class="link">{{ 'auth.backToLogin' | t }}</a>
      </p>
    </app-auth-frame>
  `,
})
export default class ForgotPasswordPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18n);
  protected readonly busy = signal(false);
  protected readonly sent = signal(false);

  protected async submit(mail: string) {
    if (!mail.trim()) return;
    this.busy.set(true);
    try {
      await this.api.forgotPassword(mail.trim());
      this.sent.set(true);
    } catch (e) {
      this.toast.error(e instanceof Error && e.message === 'mail not found' ? this.i18n.t('auth.forgot.notFound') : e);
    } finally {
      this.busy.set(false);
    }
  }
}
