import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { ApiService } from '../core/api.service';
import { TPipe } from '../core/i18n';
import { User, fullName } from '../core/models';
import { Icon } from './icon';
import { Avatar, Spinner } from './ui';

/** Suchfeld mit Vorschlagsliste für Nutzer (Name oder E-Mail) */
@Component({
  selector: 'app-user-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Avatar, Spinner, TPipe],
  template: `
    <div class="relative">
      <div class="relative">
        <app-icon name="search" [size]="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <input
          #field
          type="search"
          class="input pl-10"
          [placeholder]="placeholder() || ('search.placeholder' | t)"
          autocomplete="off"
          (input)="onInput(field.value)"
          (keydown.escape)="clear()"
        />
        @if (loading()) {
          <app-spinner class="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" />
        }
      </div>
      @if (open()) {
        <ul class="card absolute z-30 mt-2 max-h-72 w-full overflow-auto p-1 shadow-lg">
          @for (u of results(); track u.userId) {
            <li>
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                [disabled]="excludeIds().includes(u.userId)"
                [class.opacity-40]="excludeIds().includes(u.userId)"
                (click)="pick(u)"
              >
                <app-avatar [user]="u" [size]="32" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium">{{ name(u) }}</span>
                  @if (showEmail() && u.email) {
                    <span class="muted block truncate text-xs">{{ u.email }}</span>
                  }
                </span>
              </button>
            </li>
          } @empty {
            <li class="muted px-3 py-3 text-sm">{{ 'search.nothing' | t }}</li>
          }
        </ul>
      }
    </div>
  `,
})
export class UserSearch {
  private readonly api = inject(ApiService);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  readonly placeholder = input('');
  readonly adminMode = input(false);
  readonly showEmail = input(false);
  readonly excludeIds = input<number[]>([]);
  readonly selected = output<User>();

  protected readonly results = signal<User[]>([]);
  protected readonly loading = signal(false);
  protected readonly open = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private query = '';

  protected name = fullName;

  protected onInput(value: string) {
    this.query = value.trim();
    clearTimeout(this.timer);
    if (this.query.length < 2) {
      this.open.set(false);
      this.results.set([]);
      return;
    }
    this.timer = setTimeout(() => this.search(this.query), 250);
  }

  private async search(q: string) {
    this.loading.set(true);
    try {
      const users = await this.api.searchUsers(q, this.adminMode());
      if (q === this.query) {
        this.results.set(users.slice(0, 20));
        this.open.set(true);
      }
    } catch {
      this.results.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  protected pick(u: User) {
    this.selected.emit(u);
    this.clear();
  }

  clear() {
    this.field().nativeElement.value = '';
    this.query = '';
    this.results.set([]);
    this.open.set(false);
  }
}
