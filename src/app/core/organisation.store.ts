import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Organisation, OrgStatus, RawOrganisation } from './models';
import { normaliseOrganisations } from './normalise';
import { OrganisationsApi, PAGE_SIZE } from './organisations-api.service';

export type LoadState = 'loading' | 'partial' | 'ready' | 'error';
export type SortKey = 'name' | 'createdAt';
export type SortDir = 'asc' | 'desc';
export type StatusFilter = 'all' | OrgStatus;

export interface NewOrganisation {
  name: string;
  status: OrgStatus;
  ownerEmail: string;
  memberCount: number | null;
}

/**
 * Signal-based view state for the directory. No BehaviorSubjects:
 * every piece of state the template reads lives here as a signal.
 */
@Injectable()
export class OrganisationStore {
  private readonly api = inject(OrganisationsApi);

  private readonly pages = signal<Record<string, Organisation[]>>({});
  private readonly loadedPages = signal(0);
  private readonly failedPages = signal<number[]>([]);

  readonly state = signal<LoadState>('loading');
  readonly totalRecords = signal(0);

  // Filter / sort state, mirrored into the URL by the directory component.
  readonly query = signal('');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly sortKey = signal<SortKey>('name');
  readonly sortDir = signal<SortDir>('asc');

  readonly rows = computed<Organisation[]>(() => {
    const pages = this.pages();
    return Object.keys(pages)
      .sort((a, b) => pageOrder(a) - pageOrder(b))
      .flatMap((page) => pages[page] ?? []);
  });

  readonly takenNames = computed<ReadonlySet<string>>(() => {
    const names = new Set<string>();
    for (const row of this.rows()) {
      if (row.name) {
        names.add(row.name.toLowerCase());
      }
    }
    return names;
  });

  readonly view = computed<Organisation[]>(() => {
    const query = this.query().trim().toLowerCase();
    const filter = this.statusFilter();
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;

    const filtered = this.rows().filter((row) => {
      if (filter !== 'all' && row.status !== filter) {
        return false;
      }
      if (query !== '' && !(row.name ?? '').toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => dir * compareRows(a, b, key));
  });

  readonly filteredCount = computed(() => this.view().length);

  async load(): Promise<void> {
    this.state.set('loading');
    this.failedPages.set([]);
    this.pages.set({});
    this.loadedPages.set(0);

    const firstPage = await this.fetchPageSafely(0);
    if (firstPage === null) {
      this.state.set('error');
      return;
    }
    this.totalRecords.set(this.api.totalRecords);

    const pageCount = Math.ceil(this.api.totalRecords / PAGE_SIZE);
    const rest: Promise<void>[] = [];
    for (let page = 1; page < pageCount; page += 1) {
      rest.push(this.consumePage(page));
    }
    await Promise.all(rest);
    this.finish();
  }

  async retry(): Promise<void> {
    const missing = [...new Set([...this.failedPages()])].sort((a, b) => a - b);
    if (missing.length === 0) {
      await this.load();
      return;
    }
    this.failedPages.set([]);
    this.state.set('loading');
    await Promise.all(missing.map((page) => this.consumePage(page)));
    this.finish();
  }

  addOrganisation(input: NewOrganisation): void {
    const created: Organisation = {
      key: `local-${crypto.randomUUID()}`,
      id: null,
      name: input.name,
      status: input.status,
      memberCount: input.memberCount,
      ownerEmail: input.ownerEmail,
      ownerEmailValid: true,
      createdAt: new Date(),
      rawCreatedAt: new Date().toISOString(),
      flags: [],
    };
    this.pages.update((pages) => ({ ...pages, local: [...(pages['local'] ?? []), created] }));
    this.totalRecords.update((total) => total + 1);
  }

  private async consumePage(page: number): Promise<void> {
    const rows = await this.fetchPageSafely(page);
    if (rows === null) {
      this.failedPages.update((failed) => [...failed, page]);
    }
  }

  private async fetchPageSafely(page: number): Promise<Organisation[] | null> {
    try {
      const raw = await firstValueFrom(this.api.fetchPage(page));
      const normalised = normaliseOrganisations(raw as RawOrganisation[]).map((row) => ({
        ...row,
        key: `${page}-${row.key}`,
      }));
      this.pages.update((pages) => ({ ...pages, [page]: normalised }));
      this.loadedPages.update((count) => count + raw.length);
      this.state.set('partial');
      return normalised;
    } catch {
      return null;
    }
  }

  private finish(): void {
    const failed = this.failedPages();
    if (failed.length > 0) {
      // Some pages failed but we keep whatever loaded; retry only refetches those.
      this.state.set(this.rows().length === 0 ? 'error' : 'partial');
      return;
    }
    this.state.set('ready');
  }
}

function pageOrder(key: string): number {
  return key === 'local' ? Number.MAX_SAFE_INTEGER : Number(key);
}

function compareRows(a: Organisation, b: Organisation, key: SortKey): number {
  if (key === 'name') {
    // Rows without a name sort last in both directions.
    if (a.name === null && b.name === null) return 0;
    if (a.name === null) return 1;
    if (b.name === null) return -1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  }
  // Unparseable dates sort last in both directions.
  if (a.createdAt === null && b.createdAt === null) return 0;
  if (a.createdAt === null) return 1;
  if (b.createdAt === null) return -1;
  return a.createdAt.getTime() - b.createdAt.getTime();
}
