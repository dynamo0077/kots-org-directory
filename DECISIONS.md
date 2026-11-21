# DECISIONS.md

## Stack

- **Angular 22** (the brief says 18+; latest stable satisfies it and keeps the
  modern APIs in play). Standalone components only, `inject()` everywhere,
  signals for all view state, `@if`/`@for`/`@switch` control flow, typed and
  non-nullable reactive forms, `strict: true` TypeScript.
- **SCSS + CSS custom properties** for styling. No CSS framework: "plain and
  legible beats decorated".

## Data handling (the messy fixture is the assessment)

The fixture is loaded **as-is** (`src/assets/organisations.fixture.json`, generated
deterministically by `scripts/generate-fixture.mjs` from the 8 brief records kept
verbatim, expanded to 137 rows with the same classes of mess). Nothing is dropped
at the boundary; `core/normalise.ts` maps raw rows to a view model and records a
`QualityFlag` for every deviation, shown inline in the table as warning markers
with tooltips and screen-reader text.

| Quirk | Handling |
| --- | --- |
| Duplicate `id: 42` | Both rows kept. Raw `id` is refused as row key (`row-<index>` is), each row flagged `duplicate-id`. |
| Empty / `null` name | Shown as "Unnamed organisation" (muted italic), flagged `missing-name`. Unnamed rows sort last in both directions. |
| `status: "actve"` / `"suspnded"` / `null` | Unknown status: mapped to `unknown`, flagged `unknown-status`. A typo is data, not a status; silently "fixing" it would hide a data-quality problem. |
| Case variants (`ACTIVE`, `Active`) | Normalised to lowercase canonical values — case is presentation, not data. |
| `memberCount: "12"` | Parsed to a number, flagged `coerced-member-count`. |
| `memberCount: -1` / `null` | Shown as "—", flagged `invalid-member-count` (negative) — never rendered as a real count. |
| `owner.email: "not-an-email"` | Shown as-is in red, flagged `invalid-email`. Missing owner → "—" + `missing-owner`. |
| `createdAt` epoch int | Converted to a date, flagged `coerced-date`. |
| `createdAt: "not a date"` | Raw string shown in the cell, flagged `invalid-date`; row sorts last by date. |
| Long name | Truncated with CSS ellipsis, full value in `title` and available to screen readers. |
| Arabic name + emoji | Kept verbatim, `dir="auto"` on the name cell so RTL renders correctly. |

## Conflict 1 — "No pagination" vs. 25 records/request, 5 requests/minute

**Chose: no pagination UI at all; progressive chunked loading with a rate-limited
prefetch.** The list is one continuous table (what ops asked for). The store
fetches pages of 25 in the background through a sliding-window request budget
(5 requests per 60 s, exactly the API contract) and rows appear as each page
lands. A quiet banner says "Loaded X of 137…" while the tail of the data is in
flight; the 6th page waits for the rate-limit window, so a cold load shows 125
rows quickly and the last 12 within about a minute. Filtering, searching and
sorting are client-side over whatever is loaded.

- *Rejected:* infinite scroll / "load more" — that is pagination with extra
  steps and ops explicitly said they hate clicking.
- *Rejected:* blocking spinner until all 6 pages arrive — worse perceived
  performance and hides partial data that is already useful.
- *Rejected:* hammering the API ignoring the limit — it is a contract; violating
  it in production means 429s.
- *What we give up:* for the first minute, search/sort results can miss the final
  page; the partial banner makes that state explicit instead of hiding it.

## Conflict 2 — colour-only status dot vs. "never colour alone"

**Chose: keep the designer's small dot, but give every status its own shape plus
non-colour affordances.** Active = filled circle, suspended = circle with a bar,
inactive = dashed hollow circle, unknown = diamond. Each mark also carries a
screen-reader label and a hover tooltip. Colour is decoration, not the carrier.

- *Rejected:* plain text labels in the column — the designer explicitly wants the
  clean look, and a shape + label is redundant for sighted users at this density.
- *Rejected:* colour-only dot — fails the accessibility standard outright.
- *What we give up:* the literal "just a coloured dot" purity; the shapes are a
  small visual compromise that keeps the column clean.

## Other decisions and assumptions

- **URL state:** `q`, `status`, `sort`, `dir` live in query params so a filtered
  view can be shared and browser back/forward works. Empty/default values are
  omitted from the URL. Filter changes use `replaceUrl` to avoid history spam.
- **Search** is debounced (300 ms) and matches name only (as specified).
- **Form errors** appear on blur (`updateOn: 'blur'`), and an error summary at
  the top of the form lists everything wrong after submit — the submit button is
  never the only signal. Uniqueness is validated asynchronously (case-insensitive)
  against all loaded rows.
- **Adding an organisation** appends it to the local list (no backend), sorted as
  the current sort dictates via the `local` pseudo-page.
- **Dates** are rendered with `DatePipe` in the browser timezone; parsing is UTC
  for epoch values. Unparseable dates are never coerced to "now".
- **i18n:** every user-facing string lives in `src/assets/i18n/en.json` and is
  read through `I18n.t()`. Only `en` ships, as allowed.
- **Design tokens:** all colour, spacing, radius, type and shadow values live in
  `src/styles/tokens.scss`; components reference `var(--…)` only, so the brand
  colour changes in one place.
- **Failure simulation:** the mock API delays 400–900 ms and fails ~15% of list
  requests. A page failure keeps the rows already loaded and offers a retry that
  refetches only the missing pages; if nothing loaded at all, the full error
  state is shown.

## With two more days

- Unit tests for `normalise.ts` (the quirk matrix is the obvious target) and the
  store's filtering/sorting edge cases.
- A real mock server (json-server or MSW) instead of an in-process service, so
  the rate limit is enforced server-side.
- Virtual scrolling if the directory grows well past 137 rows.
