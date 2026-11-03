import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TPipe } from '../../core/i18n';

/** Rahmen für Login & Co.: Desktop zweispaltig mit Markenfläche, mobil schlicht */
@Component({
  selector: 'app-auth-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  template: `
    <div class="flex min-h-dvh">
      <section class="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-violet-800 p-12 text-white lg:flex lg:flex-col">
        <div class="flex items-center gap-3">
          <img src="logo.png" alt="" class="size-12 rounded-2xl bg-white/90 p-1" />
          <span class="text-xl font-bold">Open Wishlist</span>
        </div>
        <div class="my-auto max-w-md">
          <h2 class="text-4xl leading-tight font-bold">{{ 'auth.hero.title' | t }}</h2>
          <p class="mt-4 text-lg text-brand-100">{{ 'auth.hero.text' | t }}</p>
        </div>
        <div class="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-white/10 blur-2xl"></div>
      </section>
      <section class="flex flex-1 flex-col items-center justify-center px-5 py-10 pt-safe">
        <div class="w-full max-w-sm">
          <div class="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <img src="logo.png" alt="" class="mb-4 size-20 lg:hidden" />
            <h1 class="text-2xl">{{ title() }}</h1>
            @if (subtitle()) {
              <p class="muted mt-2 text-sm">{{ subtitle() }}</p>
            }
          </div>
          <ng-content />
        </div>
      </section>
    </div>
  `,
})
export class AuthFrame {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
