import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

type Dictionary = Record<string, string>;

/**
 * Minimal translation layer. Every user-facing string comes from
 * assets/i18n/en.json; components never inline their own copy.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly http = inject(HttpClient);
  private dict: Dictionary = {};
  readonly loaded = signal(false);

  async init(): Promise<void> {
    this.dict = await firstValueFrom(this.http.get<Dictionary>('assets/i18n/en.json'));
    this.loaded.set(true);
  }

  t(key: string, params?: Record<string, string | number>): string {
    const template = this.dict[key] ?? key;
    if (!params) {
      return template;
    }
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  }
}
