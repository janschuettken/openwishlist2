import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, output, signal, viewChild } from '@angular/core';
import { TPipe } from '../../core/i18n';
import { Icon } from '../../shared/icon';
import { Spinner } from '../../shared/ui';

const OUT_SIZE = 512;
const VIEW = 256;

/**
 * Bild wählen, quadratisch zuschneiden (Zoom + Verschieben per Ziehen)
 * und als JPEG mit 512x512 ausgeben.
 */
@Component({
  selector: 'app-avatar-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, Icon, Spinner],
  template: `
    <input #file type="file" accept="image/*" class="hidden" (change)="onFile(file)" />
    @if (!img()) {
      <button type="button" class="btn btn-secondary" (click)="file.click()">
        <app-icon name="camera" [size]="18" />{{ 'profile.chooseImage' | t }}
      </button>
    } @else {
      <div class="flex flex-col items-center gap-4">
        <canvas
          #canvas
          [width]="view"
          [height]="view"
          class="size-64 cursor-grab touch-none rounded-full ring-4 ring-brand-500/30 active:cursor-grabbing"
          (pointerdown)="startDrag($event)"
          (pointermove)="drag($event)"
          (pointerup)="endDrag()"
          (pointercancel)="endDrag()"
        ></canvas>
        <label class="flex w-64 items-center gap-3 text-sm">
          <app-icon name="search" [size]="16" class="muted" />
          <input type="range" min="1" max="4" step="0.01" class="flex-1 accent-brand-600" [value]="zoom()" (input)="zoom.set(+$any($event.target).value)" />
        </label>
        <p class="muted text-xs">{{ 'profile.cropHint' | t }}</p>
        <div class="flex gap-2">
          <button type="button" class="btn btn-ghost" (click)="reset(file)" [disabled]="uploading()">{{ 'common.cancel' | t }}</button>
          <button type="button" class="btn btn-primary" (click)="confirm()" [disabled]="uploading()">
            @if (uploading()) {
              <app-spinner />
            }
            {{ 'profile.upload' | t }}
          </button>
        </div>
      </div>
    }
  `,
})
export class AvatarPicker {
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  readonly picked = output<File>();
  readonly uploading = signal(false);

  protected readonly view = VIEW;
  protected readonly img = signal<HTMLImageElement | null>(null);
  /** true, solange ein Bild zum Zuschneiden geladen ist */
  readonly active = computed(() => !!this.img());
  protected readonly zoom = signal(1);
  private readonly offset = signal({ x: 0, y: 0 });
  private dragStart: { x: number; y: number; ox: number; oy: number } | null = null;

  constructor() {
    effect(() => {
      const img = this.img();
      const canvas = this.canvas()?.nativeElement;
      if (img && canvas) this.draw(canvas.getContext('2d')!, VIEW, img, this.zoom(), this.offset());
    });
  }

  protected onFile(input: HTMLInputElement) {
    const f = input.files?.[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      this.zoom.set(1);
      this.offset.set({ x: 0, y: 0 });
      this.img.set(img);
    };
    img.src = URL.createObjectURL(f);
  }

  protected reset(input: HTMLInputElement) {
    input.value = '';
    this.img.set(null);
  }

  protected startDrag(e: PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    this.dragStart = { x: e.clientX, y: e.clientY, ox: this.offset().x, oy: this.offset().y };
  }

  protected drag(e: PointerEvent) {
    if (!this.dragStart) return;
    this.offset.set({
      x: this.dragStart.ox + (e.clientX - this.dragStart.x),
      y: this.dragStart.oy + (e.clientY - this.dragStart.y),
    });
  }

  protected endDrag() {
    this.dragStart = null;
  }

  /** Bild so zeichnen, dass es das Quadrat füllt, plus Zoom und Verschiebung */
  private draw(ctx: CanvasRenderingContext2D, size: number, img: HTMLImageElement, zoom: number, off: { x: number; y: number }) {
    const scale = (size / Math.min(img.width, img.height)) * zoom;
    const w = img.width * scale;
    const h = img.height * scale;
    const f = size / VIEW;
    // Verschiebung begrenzen, damit keine leeren Ränder entstehen
    const maxX = (w - size) / 2;
    const maxY = (h - size) / 2;
    const x = Math.max(-maxX, Math.min(maxX, off.x * f));
    const y = Math.max(-maxY, Math.min(maxY, off.y * f));
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, (size - w) / 2 + x, (size - h) / 2 + y, w, h);
  }

  protected confirm() {
    const img = this.img();
    if (!img) return;
    const out = document.createElement('canvas');
    out.width = out.height = OUT_SIZE;
    this.draw(out.getContext('2d')!, OUT_SIZE, img, this.zoom(), this.offset());
    out.toBlob(
      (blob) => {
        if (blob) this.picked.emit(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.88,
    );
  }

  done() {
    this.img.set(null);
  }
}
