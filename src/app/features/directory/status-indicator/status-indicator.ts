import { Component, computed, inject, input } from '@angular/core';
import { I18n } from '../../../core/i18n.service';
import { OrgStatus } from '../../../core/models';

/**
 * Status marker. The designer asked for a colour dot only; the a11y standard
 * forbids colour-only information. Resolution: the mark keeps the small
 * dot aesthetic but every status also has its own shape, plus a screen-reader
 * label and a hover tooltip. Colour is decoration here, never the carrier.
 */
@Component({
  selector: 'app-status-indicator',
  styleUrl: './status-indicator.scss',
  template: `
    <span class="status status--{{ status() }}" [title]="label()">
      <svg class="status__mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        @switch (status()) {
          @case ('active') {
            <circle cx="8" cy="8" r="6" class="status__fill" />
          }
          @case ('suspended') {
            <circle cx="8" cy="8" r="5.25" class="status__stroke" />
            <rect x="4" y="7.25" width="8" height="1.5" class="status__fill" />
          }
          @case ('inactive') {
            <circle cx="8" cy="8" r="5.25" class="status__stroke status__stroke--dashed" />
          }
          @default {
            <rect x="3.75" y="3.75" width="8.5" height="8.5" transform="rotate(45 8 8)" class="status__stroke" />
          }
        }
      </svg>
      <span class="visually-hidden">{{ label() }}</span>
    </span>
  `,
})
export class StatusIndicator {
  readonly status = input.required<OrgStatus>();
  private readonly i18n = inject(I18n);
  protected readonly label = computed(() => this.i18n.t(`status.${this.status()}`));
}
