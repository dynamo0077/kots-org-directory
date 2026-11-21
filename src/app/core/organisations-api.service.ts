import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, from, map, of, shareReplay, switchMap, throwError, timer } from 'rxjs';
import { RawOrganisation } from './models';

export const PAGE_SIZE = 25;
export const REQUESTS_PER_MINUTE = 5;
export const FAILURE_RATE = 0.15;

/**
 * Sliding-window budget: at most N request starts per window.
 * Used to honour the API contract of 5 list requests per minute.
 */
class RequestBudget {
  private readonly starts: number[] = [];

  constructor(
    private readonly maxPerWindow: number,
    private readonly windowMs: number,
  ) {}

  async acquire(): Promise<void> {
    for (;;) {
      const now = Date.now();
      while (this.starts.length > 0 && now - this.starts[0] >= this.windowMs) {
        this.starts.shift();
      }
      if (this.starts.length < this.maxPerWindow) {
        this.starts.push(now);
        return;
      }
      const waitMs = this.starts[0] + this.windowMs - now;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

/**
 * Mock organisation API. Behaves like the real one described in the brief:
 * max 25 records per request, 400–900 ms latency, ~15% random failures,
 * 137 records total, and only 5 requests per minute.
 */
@Injectable({ providedIn: 'root' })
export class OrganisationsApi {
  private readonly http = inject(HttpClient);
  private readonly budget = new RequestBudget(REQUESTS_PER_MINUTE, 60_000);
  private fixture$: Observable<RawOrganisation[]> | null = null;
  private total: number | null = null;

  get totalRecords(): number {
    return this.total ?? 0;
  }

  fetchPage(page: number): Observable<RawOrganisation[]> {
    return defer(() => from(this.budget.acquire())).pipe(
      switchMap(() => this.loadFixture()),
      map((all) => {
        this.total = all.length;
        return all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
      }),
      switchMap((rows) => this.simulateNetwork(rows)),
    );
  }

  private loadFixture(): Observable<RawOrganisation[]> {
    this.fixture$ ??= this.http
      .get<RawOrganisation[]>('assets/organisations.fixture.json')
      .pipe(shareReplay(1));
    return this.fixture$;
  }

  private simulateNetwork<T>(value: T): Observable<T> {
    const latency = 400 + Math.random() * 500;
    return timer(latency).pipe(
      switchMap(() =>
        Math.random() < FAILURE_RATE
          ? throwError(() => new Error('Simulated API failure'))
          : of(value),
      ),
    );
  }
}
