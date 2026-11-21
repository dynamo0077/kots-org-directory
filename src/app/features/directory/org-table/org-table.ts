import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { I18n } from '../../../core/i18n.service';
import { Organisation, QualityCode, QualityFlag } from '../../../core/models';
import { OrganisationStore, SortKey } from '../../../core/organisation.store';
import { QualityNote } from '../quality-note/quality-note';
import { StatusIndicator } from '../status-indicator/status-indicator';

@Component({
  imports: [DatePipe, StatusIndicator, QualityNote],
  selector: 'app-org-table',
  styleUrl: './org-table.scss',
  templateUrl: './org-table.html',
})
export class OrgTable {
  protected readonly i18n = inject(I18n);
  protected readonly store = inject(OrganisationStore);

  protected toggleSort(key: SortKey): void {
    if (this.store.sortKey() === key) {
      this.store.sortDir.set(this.store.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.store.sortKey.set(key);
      this.store.sortDir.set('asc');
    }
  }

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (this.store.sortKey() !== key) {
      return 'none';
    }
    return this.store.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  protected flagsFor(row: Organisation, codes: readonly QualityCode[]): QualityFlag[] {
    return row.flags.filter((flag) => codes.includes(flag.code));
  }
}
