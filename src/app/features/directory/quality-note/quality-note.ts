import { Component, computed, inject, input } from '@angular/core';
import { I18n } from '../../../core/i18n.service';
import { QualityFlag } from '../../../core/models';

/**
 * Inline data-quality marker: shows a small warning glyph with a tooltip
 * and a screen-reader description of what is wrong with the raw value.
 */
@Component({
  selector: 'app-quality-note',
  styleUrl: './quality-note.scss',
  template: `
    <span class="quality" [title]="text()">
      <svg class="quality__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M8 1.5 15 14.5H1Z" class="quality__shape" />
        <rect x="7.25" y="5.5" width="1.5" height="4" class="quality__mark" />
        <rect x="7.25" y="10.5" width="1.5" height="1.5" class="quality__mark" />
      </svg>
      <span class="visually-hidden">{{ text() }}</span>
    </span>
  `,
})
export class QualityNote {
  readonly flag = input.required<QualityFlag>();
  private readonly i18n = inject(I18n);
  protected readonly text = computed(() => this.i18n.t(this.flag().messageKey));
}
