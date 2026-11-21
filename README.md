# Organisation Directory

Take-home assessment: a small Angular screen to find an organisation, check its
status, and add a new one — over deliberately messy mock data.

## Run

```bash
npm install
npm start        # http://localhost:4200
npm run build    # production build
```

## What is inside

- Angular (standalone components, signals, `@if`/`@for`, `inject()`), TypeScript strict.
- `src/assets/organisations.fixture.json` — 137 dirty records served by a mock API
  (400–900 ms latency, ~15% failure rate, 25 records/request, 5 requests/minute).
  Regenerate with `node scripts/generate-fixture.mjs > src/assets/organisations.fixture.json`.
- `src/app/core/normalise.ts` — turns raw rows into view models and flags every
  data-quality problem instead of silently cleaning it.
- Search (debounced) + status filter + sorting, all reflected in the URL.
- Typed reactive form with blur-time validation and an error summary.
- All user-facing strings in `src/assets/i18n/en.json`; all styling values in
  `src/styles/tokens.scss`.

See [DECISIONS.md](./DECISIONS.md) for architecture choices and how the two deliberate
conflicts were resolved.
