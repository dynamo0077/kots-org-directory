import { Component, inject } from '@angular/core';
import { I18n } from '../../../core/i18n.service';
import { OrganisationStore } from '../../../core/organisation.store';

/** Loading, empty and error states: each visually distinct. */
@Component({
  selector: 'app-state-panel',
  styleUrl: './state-panel.scss',
  templateUrl: './state-panel.html',
})
export class StatePanel {
  protected readonly i18n = inject(I18n);
  protected readonly store = inject(OrganisationStore);

  protected retry(): void {
    void this.store.retry();
  }

  protected clearFilters(): void {
    this.store.query.set('');
    this.store.statusFilter.set('all');
  }

  protected get isFilteredEmpty(): boolean {
    return this.store.rows().length > 0 && this.store.view().length === 0;
  }

  protected get isEmpty(): boolean {
    return (
      (this.store.state() === 'ready' || this.store.state() === 'partial') &&
      this.store.rows().length === 0
    );
  }
}
