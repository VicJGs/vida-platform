# PLAN — S5: Quote-embed feed + toggles  (BOO-21/22)

> Entity Delivery Flow (v1) · per-slice SERVICE track · slice 5 of 10.
> Gate 1 = this SPEC (§XXVI.2 /critique → Approval 1). Grounded in the corpus (No-Guessing).
> Module: books · Branch: `mod-books` · Profile: Add Backend Component / Default.

## §1 Context (ground truth)

- **BASELINE clean.** No code changed since S4 (`d4dfef2`); `current-business-rules.md` ends at BR-BK-S4-8 and
  already homes "conflict preset-rule via `preferences?` → S8". Currency docs are current as of HEAD — nothing to
  regenerate. `[FACT: docs/modules/books/current-business-rules.md Deferred §]`
- **Scope: 2 legs** — BOO-21 (`getEmbeddableQuotes` feed) + BOO-22 (toggle precedence resolution).
  `[FACT: slice-map.md:19]`
- **Read-only, schema-less slice.** `book_quotes` exists (`schema/books.ts:133`), `BookQuote` exists in
  `@vida/types`, toggle storage is Preferences-owned (Part B / M2). S5 touches **only** `services/books/service.ts`
  + `services/books/types.ts`. No migration, no `@vida/types` change, no validator (scope is a plain read arg, the
  `QuoteScope` precedent `types.ts:113`). `[FACT: contract.md:22-23; structure-data.md:30-31; parts/books.md BOO-22
  "Preferences store — Preferences-owned"]`
- **The frozen seam-contract pins ONE S5 method** and attaches the error to it:
  `getEmbeddableQuotes(scope: { bookId?: string }): Promise<BookQuote[]>  // per-book > global toggle (preferences?)`
  `// (embed references the stored quote — never copies; QuoteEmbedDisabledError when toggle off)`.
  `[FACT: seam-contract.md:98-100]` → S5 adds **no** by-id resolve method (resisting over-engineering; the editor
  render path is P6).
- **The narrow-port decision is already made.** interpretation.md:60 (NIT-3): Books homes a **narrow deny-safe
  `PreferencesPort?`** (the two toggle/rule reads), NOT a hard dep on the full built `services/preferences`.
  `[FACT: interpretation.md:59-60]`
- **Deny-safe precedent = habits fail-OPEN.** An absent Preferences port ⇒ permissive default (everything
  embeddable) — a user-convenience policy, not a security gate. `[FACT: services/habits/types.ts:35,45;
  service.ts:130,253 (`backfillWindowDays()` null = no limit)]`

## §2 Business rules (promoted to current-business-rules.md on SHIP, BR-BK-S5-*)

- **BR-BK-S5-1 (quote-embed feed / BOO-21)** — `getEmbeddableQuotes(scope: { bookId? }): Promise<BookQuote[]>`
  returns embeddable quotes as **live stored `BookQuote` rows** (soft-delete filtered, `isNull(deleted_at)`
  explicit — the `listQuotes` precedent). The return IS the reference; no text is copied (BK-7 "embeds reference
  the stored quote, never copy it"). `[contract.md:22-23; business-rules.md:35-37 (BK-7)]`
- **BR-BK-S5-2 (toggle precedence — per-book > global / BK-7/BOO-22)** — the effective per-book toggle resolves
  **per-book override first, global second**: `override ?? global`. Read via the deny-safe `preferences?` port.
  `[business-rules.md:35-37; conventions.md:22-23; parts/books.md BOO-22]`
- **BR-BK-S5-3 (deny-safe permissive default / NIT-3)** — `preferences?` **absent** ⇒ every quote is embeddable
  (fail-OPEN, the habits `backfillWindowDays` precedent). A present port owns its own stored defaults. No port
  coupling to the full `services/preferences`. `[interpretation.md:59-60; habits types.ts:35]`
- **BR-BK-S5-4 (`QuoteEmbedDisabledError` — the throw site / BK-7/BOO-22)** — a **scoped** call
  `getEmbeddableQuotes({ bookId })` whose book resolves toggle-OFF throws `QuoteEmbedDisabledError(bookId)` (the
  "embedding a quote whose book toggle is off" path — the editor requests one book's embeddable quotes to embed).
  The **global feed** call `getEmbeddableQuotes({})` never throws — it EXCLUDES toggle-off books (a feed yields a
  filtered list, not an error). `[FACT: contract.md:68; seam-contract.md:60,100 (error listed on getEmbeddableQuotes)]`
- **BR-BK-S5-5 (references, never copies / BK-7)** — the method returns the live rows; the editor stores a
  reference (quote id) and re-reads — copying text into the embed node is excluded and is a P6 concern anyway.
  `[structure-data.md:71 "every embed references, never copied text"; conventions.md:22]`

## §3 Deferred (homed, not built here)

- **Conflict preset-rule read** via the SAME `preferences?` port → **S8** (BOO-35; the port interface is forward-
  compatible — S8 appends one method, zero signature change to S5's two). `[slice-map.md:22; seam-contract.md:119]`
- **Real Preferences keys + per-book override UI** → P6 / M2 (Preferences-owned store; the toggle write path is
  not Books'). S5 only READS via the deny-safe port. `[parts/books.md BOO-22 cross-cutting: Preferences store keys
  (Part B)]`
- **Editor quote-embed block render** (the actual embed node + render-time re-check) → P6 (`@vida/editor`-owned).
  `[parts/books.md BOO-21 boundary SPLIT: service provides · P6 renders]`
- **`tags` grouping on the feed** → S9 (lands with `scopeTag`/BOO-04, the `listQuotes` `tags?` carry-forward).

## §4 Acceptance (the live-store Verification Gate maps 1:1)

Live-store (REAL better-sqlite3, Node 24), fixtures = a few books + quotes:

1. **No port, global feed** — `getEmbeddableQuotes({})` returns ALL non-deleted quotes (permissive default).
2. **No port, scoped** — `getEmbeddableQuotes({ bookId: A })` returns A's quotes (permissive); never throws.
3. **Soft-delete excluded** — a soft-deleted quote never appears in either shape.
4. **Precedence — override ON under global OFF** — port: global=false, override[A]=true. `{}` feed returns A's
   quotes only; `{ bookId: A }` returns A's quotes; `{ bookId: B }` (no override, global false) **throws
   `QuoteEmbedDisabledError`**.
5. **Precedence — override OFF under global ON** — port: global=true, override[C]=false. `{ bookId: C }` **throws
   `QuoteEmbedDisabledError`**; the `{}` feed EXCLUDES C's quotes (no throw) while including other books'.
6. **References the stored row** — a returned quote's `id`/`text` equal the stored row (no copy/transform).

@vida/core suite stays green (1473 + new S5 tests); tsc 0; eslint 0; gitleaks clean.

## §5 Implementation prompt (type-first; factory-object; no `this.`)

**(a) `services/books/types.ts`**
- Add the narrow deny-safe port:
  ```ts
  /** S5 — narrow deny-safe quote-embed toggle reads (BK-7, NIT-3). Books homes this 2-read port rather than a hard
   *  dep on the full `services/preferences`. ABSENT ⇒ permissive (all embeddable), the habits fail-OPEN precedent.
   *  S8 appends the conflict preset-rule read (zero signature change). */
  export interface PreferencesPort {
    /** Global quote-embed toggle. The port owns its stored default. */
    getQuoteEmbedGlobal(): Promise<boolean>
    /** Per-book override; `undefined` ⇒ no override (fall through to global). */
    getQuoteEmbedOverride(bookId: string): Promise<boolean | undefined>
  }
  ```
- Add `preferences?: PreferencesPort` to `BooksServiceDeps` (optional; the S5 line in the "S5–S10 append" comment).
- Add the typed error (mirrors `BookNotFoundError`):
  ```ts
  /** BK-7/BOO-22 — a scoped embeddable-quotes request for a toggle-OFF book (per-book > global). The global feed
   *  excludes toggle-off books instead of throwing. `[FACT: contract.md:68; seam-contract.md:60,100]` */
  export class QuoteEmbedDisabledError extends Error {
    constructor(public readonly bookId: string) {
      super(`Quote embedding disabled for book ${bookId}`)
      this.name = 'QuoteEmbedDisabledError'
    }
  }
  ```

**(b) `services/books/service.ts`**
- Destructure `preferences` from deps (optional).
- Hoisted closure (no `this.`), the toggle resolver:
  ```ts
  async function resolveEmbedToggle(bookId: string): Promise<boolean> {
    if (!preferences) return true                               // BR-BK-S5-3 deny-safe permissive
    const override = await preferences.getQuoteEmbedOverride(bookId)
    if (override !== undefined) return override                 // BR-BK-S5-2 per-book > global
    return preferences.getQuoteEmbedGlobal()
  }
  ```
- `getEmbeddableQuotes`:
  ```ts
  async function getEmbeddableQuotes(scope: { bookId?: string }): Promise<BookQuote[]> {
    if (scope.bookId) {
      if (!(await resolveEmbedToggle(scope.bookId))) throw new QuoteEmbedDisabledError(scope.bookId)  // BR-BK-S5-4
      const rows = await quotesRepo.findWhere(
        and(isNull(bookQuotes.deleted_at), eq(bookQuotes.book_id, scope.bookId)) as SQL,
      )
      return rows.map(toQuote)                                  // live rows; BR-BK-S5-1/5
    }
    // global feed — exclude toggle-off books; no throw (BR-BK-S5-4)
    const rows = await quotesRepo.findWhere(isNull(bookQuotes.deleted_at))
    if (!preferences) return rows.map(toQuote)                 // permissive fast-path (BR-BK-S5-3)
    const prefs = preferences                                  // capture for narrowing in the nested closure
    const global = await prefs.getQuoteEmbedGlobal()           // read ONCE (g1 NIT: no per-book re-read)
    const distinct = [...new Set(rows.map((r) => r.book_id))]
    const overrides = new Map(
      await Promise.all(distinct.map(async (b) => [b, await prefs.getQuoteEmbedOverride(b)] as const)),
    )
    return rows.filter((r) => overrides.get(r.book_id) ?? global).map(toQuote)  // override > global (BR-BK-S5-2)
  }
  ```
- Add `getEmbeddableQuotes` to the returned factory object + the `BooksService` interface (after `listQuotes`).

**(c) D6 / §XXIX** — refresh `docs/modules/books/current-spec.md` (method row) + `current-business-rules.md`
(BR-BK-S5-1..5; move the conflict-preset-rule note stays S8) in the SHIP commit.

**Order:** types (port + error) → resolver closure → `getEmbeddableQuotes` → interface/factory wiring → tsc →
Verification Gate → code-review → currency.

## §6 g1 resolution (grounded in the corpus)

- **R1 — throw site: scoped call throws · global feed filters (BR-BK-S5-4).** The one genuine interpretation.
  Grounded: `contract.md:68` ("Embedding a quote whose book toggle is off → `QuoteEmbedDisabledError`") +
  `seam-contract.md:60,100` attach the error to `getEmbeddableQuotes` itself — there is NO separate by-id resolve
  method (that render-time re-check is P6, `parts/books.md BOO-21` SPLIT). A **feed** yields a filtered list, never
  an error; the **scoped** `{ bookId }` call is the "embed from this book" path, so it is the natural throw site.
  Alternative (scoped returns `[]`) **rejected** — it collapses the *disabled* signal into *no-quotes*. No new
  method added (anti-over-engineering; frozen seam-contract honored). `[FACT: seam-contract.md:98-100; contract.md:68]`
- **R2 — single-method, no by-id resolve.** Confirmed faithful to the frozen seam-contract (one S5 row). The
  editor's render-time re-check of an already-embedded quote is P6 (stores `bookId` on the node, re-calls the
  scoped method). `[FACT: seam-contract.md:98-100]`
- **R3 — NIT folded (feed perf/clarity).** The global-feed loop reads `getQuoteEmbedGlobal()` ONCE (not per book)
  and applies `override ?? global` per distinct book — one precedence read path, cleaner. `[g1]`
- **TS note (Step 8 guard):** after the `if (!preferences) return …` fast-path, capture `const prefs = preferences`
  before the `Promise.all` arrow so control-flow narrowing survives into the nested closure (avoid a
  `possibly-undefined` tsc error on `preferences.getQuoteEmbedOverride`). `[engineering.md XV — strict, zero suppressions]`
