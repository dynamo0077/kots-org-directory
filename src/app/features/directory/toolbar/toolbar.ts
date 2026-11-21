import { Component, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { I18n } from '../../../core/i18n.service';
import { ORG_STATUSES } from '../../../core/models';
import { OrganisationStore, StatusFilter } from '../../../core/organisation.store';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-toolbar',
  styleUrl: './toolbar.scss',
  templateUrl: './toolbar.html',
})
export class Toolbar {
  protected readonly i18n = inject(I18n);
  protected readonly store = inject(OrganisationStore);
  protected readonly statuses = ORG_STATUSES;

  /** Debounced free-text search on name. */
  protected readonly search = new FormControl('', { nonNullable: true });

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => this.store.query.set(value));

    // Keep the input in sync when the query comes from the URL.
    effect(() => {
      const query = this.store.query();
      if (this.search.value !== query) {
        this.search.setValue(query, { emitEvent: false });
      }
    });
  }

  protected onStatusChange(value: string): void {
    this.store.statusFilter.set(value as StatusFilter);
  }
}
