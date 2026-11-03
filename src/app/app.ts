import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/ui.services';
import { Overlays } from './layout/overlays';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Overlays],
  template: `<router-outlet /><app-overlays />`,
})
export class App {
  // Theme-Service früh anlegen, damit Hell/Dunkel sofort greift
  private readonly theme = inject(ThemeService);
}
