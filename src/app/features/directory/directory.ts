import { Component, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { I18n } from '../../core/i18n.service';
import {
  OrganisationStore,
  SortDir,
  SortKey,
  StatusFilter,
} from '../../core/organisation.store';
import { OrgForm } from './org-form/org-form';
import { OrgTable } from './org-table/org-table';
import { StatePanel } from './state-panel/state-panel';
import { Toolbar } from './toolbar/toolbar';

const STATUS_VALUES: readonly StatusFilter[] = ['all', 'active', 'suspended', 'inactive', 'unknown'];
const SORT_VALUES: readonly SortKey[] = ['name', 'createdAt'];
const DIR_VALUES: readonly SortDir[] = ['asc', 'desc'];

@Component({
  imports: [Toolbar, StatePanel, OrgTable, OrgForm],
  selector: 'app-directory',
  styleUrl: './directory.scss',
  templateUrl: './directory.html',
  providers: [OrganisationStore],
})
export class Directory {
  protected readonly store = inject(OrganisationStore);
  protected readonly i18n = inject(I18n);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    // URL -> state: also makes browser back/forward work.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const q = params.get('q') ?? '';
      const status = asValue<StatusFilter>(params.get('status'), STATUS_VALUES, 'all');
      const sort = asValue<SortKey>(params.get('sort'), SORT_VALUES, 'name');
      const dir = asValue<SortDir>(params.get('dir'), DIR_VALUES, 'asc');

      if (q !== this.store.query()) this.store.query.set(q);
      if (status !== this.store.statusFilter()) this.store.statusFilter.set(status);
      if (sort !== this.store.sortKey()) this.store.sortKey.set(sort);
      if (dir !== this.store.sortDir()) this.store.sortDir.set(dir);
    });

    // State -> URL: shareable filtered views, no history spam.
    effect(() => {
      const q = this.store.query();
      const status = this.store.statusFilter();
      const sort = this.store.sortKey();
      const dir = this.store.sortDir();

      const current = this.route.snapshot.queryParamMap;
      const sameAsUrl =
        (current.get('q') ?? '') === q &&
        (current.get('status') ?? 'all') === status &&
        (current.get('sort') ?? 'name') === sort &&
        (current.get('dir') ?? 'asc') === dir;
      if (sameAsUrl) {
        return;
      }

      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          q: q === '' ? null : q,
          status: status === 'all' ? null : status,
          sort: sort === 'name' ? null : sort,
          dir: dir === 'asc' ? null : dir,
        },
        replaceUrl: true,
      });
    });

    void this.store.load();
  }
}

function asValue<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}
