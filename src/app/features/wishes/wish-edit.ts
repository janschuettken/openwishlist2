import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../core/api.service';
import { I18n, TPipe } from '../../core/i18n';
import { Wish, emptyWish } from '../../core/models';
import { ConfirmService, PageTitle, ToastService } from '../../core/ui.services';
import { Icon } from '../../shared/icon';
import { Loading, PageHeader, Spinner } from '../../shared/ui';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, Icon, PageHeader, Loading, Spinner],
  template: `
    <app-page-header [title]="(isNew() ? 'wish.new' : 'wish.edit') | t" [back]="true" />

    @if (loading()) {
      <app-loading />
    } @else {
      <div class="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form class="card space-y-5 p-5 lg:p-6" (submit)="$event.preventDefault(); save()">
          <!-- Link zuerst: daraus lassen sich die übrigen Felder füllen -->
          <div>
            <label class="label" for="url">{{ 'wish.url' | t }}</label>
            <div class="flex gap-2">
              <input id="url" type="url" class="input" placeholder="https://…" [value]="w().url" (input)="patch({ url: val($event) })" />
              <button type="button" class="btn btn-secondary shrink-0" (click)="fromLink()" [disabled]="previewing() || w().url.length < 8" [title]="'wish.fromLink' | t">
                @if (previewing()) {
                  <app-spinner />
                } @else {
                  <app-icon name="wand" [size]="18" />
                }
                <span class="hidden sm:inline">{{ 'wish.fromLink' | t }}</span>
              </button>
            </div>
            <p class="muted mt-1 text-xs">{{ 'wish.fromLink.hint' | t }}</p>
          </div>

          <div>
            <label class="label" for="title">{{ 'wish.title' | t }} *</label>
            <input id="title" class="input" [value]="w().title" (input)="patch({ title: val($event) })" required maxlength="200" />
          </div>

          <div>
            <label class="label" for="desc">{{ 'wish.description' | t }}</label>
            <textarea id="desc" rows="5" class="input resize-y" [value]="w().description" (input)="patch({ description: val($event) })"></textarea>
          </div>

          @if (isNew()) {
            <div>
              <label class="label" for="img">{{ 'wish.image' | t }}</label>
              <input id="img" type="url" class="input" placeholder="https://…/bild.jpg" [value]="w().wishImgUrl ?? ''" (input)="patch({ wishImgUrl: val($event) || null })" />
            </div>
          }

          <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center">
            @if (!isNew()) {
              <button type="button" class="btn btn-ghost text-rose-600 dark:text-rose-400" (click)="remove()" [disabled]="busy()">
                <app-icon name="trash" [size]="18" />{{ 'common.delete' | t }}
              </button>
              <button type="button" class="btn btn-ghost" (click)="toggleArchive()" [disabled]="busy()">
                <app-icon [name]="w().archived ? 'undo' : 'archive'" [size]="18" />
                {{ (w().archived ? 'wish.unarchive' : 'wish.archive') | t }}
              </button>
            }
            <button type="submit" class="btn btn-primary sm:ml-auto" [disabled]="busy()">
              @if (busy()) {
                <app-spinner />
              }
              {{ (isNew() ? 'wish.create' : 'common.save') | t }}
            </button>
          </div>
        </form>

        <!-- Vorschau -->
        <aside class="hidden lg:block">
          <p class="section-title mb-3">{{ 'common.preview' | t }}</p>
          <div class="card overflow-hidden">
            <div class="flex aspect-square items-center justify-center bg-slate-100 dark:bg-slate-800">
              @if (w().wishImgUrl) {
                <img [src]="w().wishImgUrl" alt="" class="size-full object-contain" />
              } @else {
                <app-icon name="image" [size]="40" class="text-slate-300 dark:text-slate-600" />
              }
            </div>
            <div class="p-4">
              <p class="font-semibold">{{ w().title || ('wish.title' | t) }}</p>
              <p class="muted mt-1 line-clamp-4 text-sm whitespace-pre-line">{{ w().description }}</p>
            </div>
          </div>
          @if (!isNew()) {
            <p class="muted mt-3 text-xs">{{ 'wish.imageFixed' | t }}</p>
          }
        </aside>
      </div>
    }
  `,
})
export default class WishEditPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly i18n = inject(I18n);
  private readonly pageTitle = inject(PageTitle);

  /** Routenparameter */
  readonly id = input<string>();
  readonly eventId = input<string>();

  protected readonly w = signal<Wish>(emptyWish());
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly previewing = signal(false);
  protected readonly isNew = computed(() => !this.id() || Number(this.id()) <= 0);

  async ngOnInit() {
    this.pageTitle.set(this.i18n.t(this.isNew() ? 'wish.new' : 'wish.edit'));
    if (this.isNew()) return;
    this.loading.set(true);
    try {
      const wish = await this.api.getOwnWish(Number(this.id()));
      if (!wish) {
        this.toast.error(this.i18n.t('wish.notFound'));
        await this.router.navigate(['/wishes']);
        return;
      }
      this.w.set(wish);
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  protected val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  protected patch(p: Partial<Wish>) {
    this.w.update((w) => ({ ...w, ...p }));
  }

  /** Titel, Beschreibung und Bild über linkpreview.net aus dem Link holen */
  protected async fromLink() {
    const url = this.w().url.trim();
    if (!url) return;
    this.previewing.set(true);
    try {
      const res = await fetch(`${environment.linkPreviewUrl}/?key=${environment.linkPreviewKey}&q=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error();
      const r = await res.json();
      this.patch({
        title: r.title || this.w().title,
        description: r.description || this.w().description,
        ...(this.isNew() && r.image ? { wishImgUrl: r.image } : {}),
      });
    } catch {
      this.toast.error(this.i18n.t('wish.fromLink.failed'));
    } finally {
      this.previewing.set(false);
    }
  }

  protected async save() {
    const w = this.w();
    if (w.title.trim().length < 2) {
      this.toast.error(this.i18n.t('wish.titleRequired'));
      return;
    }
    this.busy.set(true);
    try {
      if (this.isNew()) {
        const wishId = await this.api.addWish({ ...w, title: w.title.trim() });
        const eventId = Number(this.eventId());
        if (eventId > 0) {
          await this.api.addWishToList(eventId, wishId);
        }
        this.toast.success(this.i18n.t('wish.created'));
      } else {
        await this.api.editWish({ ...w, title: w.title.trim() });
        this.toast.success(this.i18n.t('common.saved'));
      }
      this.location.back();
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected async toggleArchive() {
    this.busy.set(true);
    try {
      const archived = !this.w().archived;
      await this.api.editWish({ ...this.w(), archived });
      this.patch({ archived });
      this.toast.success(this.i18n.t(archived ? 'wish.archived' : 'wish.unarchived'));
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove() {
    const ok = await this.confirm.ask(this.i18n.t('wish.delete.confirm'), {
      text: this.i18n.t('wish.delete.text'),
      confirmLabel: this.i18n.t('common.delete'),
    });
    if (!ok) return;
    this.busy.set(true);
    try {
      await this.api.deleteWish(this.w().wishId);
      this.toast.success(this.i18n.t('wish.deleted'));
      await this.router.navigate(['/wishes']);
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
