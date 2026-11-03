import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TPipe } from '../core/i18n';
import { EmptyState } from '../shared/ui';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TPipe, EmptyState],
  template: `
    <app-empty icon="alert" [title]="'notFound.title' | t" [text]="'notFound.text' | t">
      <a routerLink="/home" class="btn btn-primary btn-sm">{{ 'nav.home' | t }}</a>
    </app-empty>
  `,
})
export default class NotFoundPage {}
