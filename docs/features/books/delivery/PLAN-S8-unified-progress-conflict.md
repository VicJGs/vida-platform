# PLAN — S8: Unified progress + conflict resolution  (BOO-13/34/35)

> Entity Delivery Flow (v1) · per-slice SERVICE track · slice 8 of 10.
> Gate 1 = this SPEC (§XXVI.2 /critique → Approval 1). Grounded in the corpus (No-Guessing).
> Module: books · Branch: `mod-books` · Profile: Add Backend Component / Default.

## §0 Documentation grounding (authority trace — the intent source for every S8 element)

> The aspect docs + the Part-1.2 rerun driver-tokens are the intent authority; they outrank the slice-map/seam-contract.

| S8 element | Authoritative doc source (intent) |
|---|---|
| **Unified progress is DERIVED** from asset positions; `books.progress` = nullable override (`NULL ⇒ derive`, M3); never hand-set | **BK-3** (`business-rules.md:18-22`) · **BOO-13** (`parts/books.md:23`) · `structure-data.md:9,12-14,40-41` · `conventions.md:11-13` |
| return shape `number \| 'conflicted' \| null`; `null` = unmeasured | `seam-contract.md:117` (`getUnifiedProgress`) · BR-2 (measurement `engine.ts:44` — empty/all-null ⇒ null) |
| Terminal states: **derived · manual-override · conflicted** | **BOO-13** (`parts/books.md:23` "Terminal: derived · manual-override · conflicted (BK-8)") |
| measure vocabulary = `quantitative` × `derived-pull`; **NO stored `books.measurement_kind`** (C-M1) — Books names the axes, stores none | **BOO-14** (`parts/books.md:24`) · rerun `books.md:71` (C-M1) |
| **Position/progress clash ⇒ ASK by default, RULE if set** — the preset rule lives in **Preferences** | **BK-8** (`business-rules.md:38-40`) · **BOO-34/35** (`parts/books.md:44-45`) |
| conflict rule enum = `{ask, source_of_truth, last_valid, photo_valid}` | `conventions.md:36` `[INTENT B16]` |
| **Conflict resolution is derived, not a table** — React-Query-derived `getConflicts`; `PositionConflictPending` (typed); an unresolved conflict **blocks** unified progress (flagged "conflicted", never guessed) | **interpretation.md:153-156** (rule 7) `[FACT: db-4-books/_index.md:32-33; BK-8]` |
| `getConflicts(bookId)` / `resolveConflict(id, choice)` — the conflict-resolution engine; clash between sources (assets, photo capture) surfaces; unresolved blocks; `PositionConflictPending` on write; preset rule read from Preferences, auto-applies | **BOO-34** (`parts/books.md:44`) · `seam-contract.md:47,58,116-118` |
| `ConflictItem = { id; bookId; sources: PositionSource[]; blocking: true }` | `seam-contract.md:47` (frozen type) |
| cross-format mapping is **unbuilt at M1** (always `not-synced`) → heterogeneous-unit assets (epub/audio) cannot normalize ⇒ unmeasured, never guessed (fail loud) | **BK-4** (`business-rules.md:23-30`) · `types.ts:123-130` (`MappedPosition` always `not-synced` at M1) |
| narrow deny-safe `PreferencesPort?` (NIT-3) — "two toggle/rule reads"; S8 appends the conflict-rule read; absent ⇒ permissive default | `interpretation.md:59-60` · `types.ts:74-77,180-185` |
| invalidate unified progress on any asset-position/session write | **BOO-13** (`parts/books.md:23`) · `structure-data.md:38-41` — **React-Query (P6) concern**; the service stays derive-on-read (no cache to bust here) |

**Genuinely build-phase (resolved here, grounded — not deferred):**
- The derivation **arithmetic** (quantitative `normalize` over `native_position`/`total_pages`) — grounded in `foundation/measurement engine.ts:14-22` + BOO-14 (`quantitative`/`derived-pull`).
- **Which assets produce a candidate at M1**: page-unit formats only (`pdf·physical·braille`) with a strict-integer `native_position` and a work-level `total_pages > 0`. `epub` (location) and `audiobook` (timestamp) carry non-page units whose normalization needs the **unbuilt** cross-format mapping (BK-4), and `other` is an unknown unit by definition → all three are **unmeasured** (`null`, BR-2), never guessed. `[INTERP: BK-4 + BR-2; the honest M1 candidate set]`
- `ConflictChoice` / `PositionSource` / `ConflictRule` type shapes (new S8 service-layer types — the `MappedPosition`/`MasterySource` precedent, NOT `@vida/types`).
- Where `PositionConflictPending` throws vs where `'conflicted'` is returned (see §2 BR-BK-S8-6).

**Deferred (homed, NOT built here):** the P6 conflict-prompt UI + progress ring + React-Query invalidation wiring (`parts/books.md:5` SPLIT) · the real Preferences-backed conflict-rule adapter (M2 — `types.ts:75-77`) · photo-capture position sources (OCR = `ai-unavailable` at M1, S10/M2) · the cross-format mapping algorithm (S3 `getMappedPosition` design-pass → build).

---

## §1 Context (ground truth)

- **Service**: `createBooksService` (`packages/core/src/services/books/service.ts`, 1008 L; factory-object, no `this.`). S1–S7 shipped; @vida/core **1505/1505** green. Branch `mod-books`.
- **Schema** (`schema/books.ts`): `books.progress integer` (nullable override, `:53`) · `books.total_pages integer` (work-level, `:52`) · `book_assets.native_position text` (`:96`, plaintext) + `book_assets.format` ∈ `BOOK_ASSET_FORMAT` · **no conflict table** (confirmed `:30` design note). `baseColumns` give `updated_at` (used for `last_valid`).
- **Measurement engine** (`foundation/measurement/engine.ts`): `normalize({kind:'quantitative', current, baseline, target, isHigherBetter})` → `[0,1]|null` (`:14`); `resolveProgress(stored, derive)` → override-or-derive (`:56`). Pure, composed (not re-implemented).
- **Existing S3 reads**: `getMappedPosition` always `{status:'not-synced', nativePosition}` at M1 (`service.ts:533-542`); `updatePosition` writes `native_position` SSOT (`:514`). Assets listed soft-delete-filtered (`listAssets` precedent).
- **S5 `preferences?` port** (`types.ts:180-185`): `getQuoteEmbedGlobal()` + `getQuoteEmbedOverride(bookId)`. S8 **appends** `getConflictRule`/`setConflictRule` — zero change to the existing two signatures.
- **`getBook`** (`service.ts:330-345`): currently returns `unifiedProgress: null` (deny-safe not-yet-composed default, S1 placeholder). S8 wires it to `getUnifiedProgress` and widens `BookView.unifiedProgress`.

---

## §2 Business rules (promoted to current-business-rules.md on SHIP, BR-BK-S8-*)

- **BR-BK-S8-1 (unified progress is derive-on-read / BK-3, BOO-13)** — `getUnifiedProgress(bookId)` returns
  `number | 'conflicted' | null`. It composes `resolveProgress(book.progress, derive)` (`engine.ts:56`): a non-null
  `books.progress` is the **manual-override** terminal (returned verbatim, clamped 0–100); `null` ⇒ **derive**. No
  progress column is ever written by this slice. `[FACT: business-rules.md:18-22; engine.ts:56]`

- **BR-BK-S8-2 (candidate derivation — quantitative normalize / BOO-14)** — `derive()` computes a per-asset
  candidate ∈ `[0,1]` only for a **page-unit** asset: `format ∈ {pdf, physical, braille}` **and**
  `native_position` matches `/^\d+$/` **and** `book.total_pages > 0`. The candidate =
  `normalize({kind:'quantitative', current: parseInt(native_position), baseline: 0, target: total_pages, isHigherBetter: true})`.
  `epub`/`audiobook` assets (location/timestamp units) yield **no candidate** — their normalization needs the unbuilt
  cross-format mapping (BK-4) ⇒ unmeasured, never guessed. **`other` is excluded too (N1)**: its unit is unknown by
  definition, so assuming pages would guess it — unmeasured is the honest state. `[FACT: engine.ts:14-22; INTERP: BK-4 + BR-2 candidate set; `other`-unit unknown = No-Guessing]`

- **BR-BK-S8-3 (unmeasured ⇒ null / BR-2)** — zero page-unit candidates (no copy, TOC-only, or only epub/audio
  assets) ⇒ `getUnifiedProgress` returns `null` (unmeasured), consistent with `engine.ts:44`. Never coerced to 0.
  `[FACT: engine.ts:44; business-rules.md:122]`

- **BR-BK-S8-4 (agreement ⇒ a value; rounding absorbs near-ties / N3)** — one candidate, or ≥2 candidates whose
  values agree (equal when rounded to the 0–100 integer), ⇒ that rounded value (`Math.round(fraction * 100)`).
  Rounding-to-agree is **intentional**: 49.6 % and 50.4 % both round to 50 ⇒ **no false conflict**; only a genuine
  page-level disagreement surfaces as a clash. `[FACT: structure-data.md "progress 0-100"; INTERP: rounding absorbs sub-point drift by design]`

- **BR-BK-S8-5 (clash ⇒ ASK by default, RULE if set / BK-8, BOO-34/35)** — ≥2 page-unit candidates that **disagree**
  (distinct rounded values) are a clash. The preset rule is read via `preferences?.getConflictRule(bookId)` (absent
  port **or** `undefined` ⇒ `ask`), and applied on READ: `ask` ⇒ `'conflicted'`; `source_of_truth` ⇒ the named asset's
  candidate **iff it is in the clash** (else `'conflicted'` — positions move, a read-side miss is honest, not an
  error); `last_valid` ⇒ the candidate of the asset with the greatest `updated_at`, **tie-broken by asset `id`
  descending** (N2 — deterministic); `photo_valid` ⇒ **no photo-source position exists at M1** (OCR `ai-unavailable`)
  ⇒ the rule **cannot apply yet** ⇒ `'conflicted'` (honest — it resolves automatically once a photo source lands, M2).
  `[FACT: business-rules.md:38-40; conventions.md:36]`

- **BR-BK-S8-6 (`PositionConflictPending` — forward seam, wired at its first consumer / B1)** — the typed error is the
  signal that a context **requiring a definite unified progress** cannot proceed while the book is `'conflicted'`. No
  such consumer exists at S8 — the first is **S9 `getReadingMeasureSource`** (a `derived-pull` reading measure needs a
  number). So S8 **exports** `PositionConflictPending` as a forward seam and documents its throw-site as S9; it is
  **not** thrown anywhere in S8. `getUnifiedProgress`/`getConflicts`/`resolveConflict` all stay **non-throwing** for a
  conflict (the `'conflicted'` flag is the read/display teeth). Crucially, `resolveConflict` does **not** throw when a
  valid preset doesn't apply yet (e.g. `photo_valid` at M1) — presetting a forward-looking rule is a legitimate,
  successful write (BK-8 "the user MAY preset a rule … which then resolves automatically"). `[FACT: interpretation.md:153-156; seam-contract.md:58; BK-8; INTERP: throw-site deferred to S9 consumer]`

- **BR-BK-S8-7 (`getConflicts` — derived queue, no table / interpretation rule 7)** — `getConflicts(bookId)` loads the
  book first (`BookNotFoundError` if absent — fail-loud parity with `getUnifiedProgress`, N4), then re-runs the
  candidate computation; if a clash exists **and** the preset rule does not resolve it to a single value, returns
  `[{ id: 'conflict:'+bookId, bookId, sources: PositionSource[], blocking: true }]` (the frozen `ConflictItem` shape,
  one book-level clash); otherwise `[]`. `sources` = the competing page-unit `PositionSource[]`. The id is
  **deterministic** (no table): `conflict:<bookId>`. `[FACT: seam-contract.md:47; interpretation.md:153-156]`

- **BR-BK-S8-8 (`resolveConflict` — persist a valid preset via the deny-safe port / BOO-34/35, B2)** —
  `resolveConflict(id, choice)` parses `<bookId>` from `id` (malformed/non-existent book ⇒ `BookNotFoundError`),
  **validates structural integrity of the choice** on **Books-owned data** (port-independent) — a `source_of_truth`
  `assetId` MUST belong to the book's non-deleted assets, else `BookAssetNotFoundError` (presetting a source that
  cannot exist is a structural error, distinct from a read-side "not currently in the clash" miss) — then persists via
  `preferences.setConflictRule(bookId, choice)`. An **absent `preferences?` port ⇒ no-op** — the exact
  `revokeLookupGrant` precedent (**BR-BK-S2-6**: "no dep ⇒ no-op"); the port is a deny-safe convenience seam, not a
  security gate (`types.ts:77`), and the real Preferences-backed write lands at M2/P6 (zero-signature swap). A
  structurally-valid but not-yet-applicable preset (`photo_valid` at M1) persists and does not throw (BR-BK-S8-6).
  `[FACT: business-rules.md:38-40; BK-8; BR-BK-S2-6 (revokeLookupGrant no-op); types.ts:76-77 (M2 write); INTERP: source_of_truth structural validation]`

- **BR-BK-S8-9 (`BookView.unifiedProgress` reconcile / BOO-03)** — `getBook` composes S8: `unifiedProgress` is set to
  `await getUnifiedProgress(id)`, and `BookView.unifiedProgress` widens from `number | null` to
  `number | 'conflicted' | null`. The S1 placeholder (`:342`) is retired. `[FACT: seam-contract.md:73; types.ts:204]`

- **BR-BK-S8-10 (`PreferencesPort` extension — NIT-3 narrow)** — the port gains the derivation-input **read**
  `getConflictRule(bookId): Promise<ConflictChoice | undefined>` (`types.ts:76` "S8 appends the conflict preset-rule
  read"; the stored rule carries the `assetId` for `source_of_truth`; `undefined` ⇒ the BK-8 default `ask`) and the
  `resolveConflict` **write seam** `setConflictRule(bookId, choice): Promise<void>` (the M2 zero-signature swap target,
  `types.ts:77`). The two S5 quote-embed signatures are **unchanged**; absent port ⇒ permissive read (`ask`) + no-op
  write. `[FACT: interpretation.md:59-60; types.ts:76-77,180-185; BK-8]`

---

## §3 Deferred (homed, not built here)

- P6 (SPLIT UI): conflict-prompt render, progress ring/indicator, React-Query invalidation on asset-position/session write (`parts/books.md:5,23`).
- Real Preferences-backed conflict-rule adapter — M2 zero-signature swap (`types.ts:75-77`).
- Photo-capture position source (`photo_valid` rule input) — OCR is `ai-unavailable` at M1 (S10/M2).
- Cross-format mapping algorithm (would let epub/audio assets contribute candidates) — S3 `getMappedPosition` design-pass → build (BK-4).

---

## §4 Acceptance (the live-store Verification Gate maps 1:1)

1. `getUnifiedProgress` — TOC-only / no copy ⇒ `null`; single page-unit asset ⇒ rounded value; non-null `books.progress` ⇒ that override value (manual-override terminal).
2. `getUnifiedProgress` — only epub/audio assets ⇒ `null` (unmeasured, not guessed).
3. `getUnifiedProgress` — two agreeing page-unit assets ⇒ the shared value; two disagreeing + no rule ⇒ `'conflicted'`.
4. `getUnifiedProgress` — disagreeing + `source_of_truth` (asset in clash) ⇒ that asset's value; + `last_valid` ⇒ greatest-`updated_at` value (tie → asset `id` desc); + `photo_valid` ⇒ `'conflicted'` (can't apply at M1).
5. `getConflicts` — no clash ⇒ `[]`; unresolved clash ⇒ one `ConflictItem` with `id='conflict:'+bookId`, `blocking:true`, competing `sources`; non-existent book ⇒ `BookNotFoundError`.
6. `resolveConflict` — present port, resolving choice ⇒ persists rule, subsequent `getUnifiedProgress` returns the resolved value; a valid not-yet-applicable preset (`photo_valid` at M1) ⇒ persists, **does not throw**, book stays `'conflicted'`; `source_of_truth` naming an asset not on the book ⇒ `BookAssetNotFoundError`; **absent port ⇒ no-op** (rule not persisted, book stays `'conflicted'` — the `revokeLookupGrant` precedent); malformed/non-existent book id ⇒ `BookNotFoundError`. `PositionConflictPending` is **exported but not thrown in S8** (forward seam → S9).
7. `getBook` — `unifiedProgress` reflects `getUnifiedProgress` (null/number/'conflicted'), typed `number | 'conflicted' | null`.
8. `@vida/core` suite green (1505 + new S8 tests); tsc 0; eslint 0; gitleaks clean.

---

## §5 Implementation prompt (type-first; factory-object; no `this.`)

**Types (`services/books/types.ts`):**
```ts
export type ConflictRule = 'ask' | 'source_of_truth' | 'last_valid' | 'photo_valid'
export type ConflictChoice =
  | { rule: 'source_of_truth'; assetId: string }
  | { rule: 'last_valid' }
  | { rule: 'photo_valid' }
export interface PositionSource { assetId: string; format: BookAssetFormat; nativePosition: string; progress: number }
export interface ConflictItem { id: string; bookId: string; sources: PositionSource[]; blocking: true }
// PreferencesPort += getConflictRule(bookId): Promise<ConflictChoice | undefined>; setConflictRule(bookId, choice): Promise<void>
// BookView.unifiedProgress: number | 'conflicted' | null
```

**Service (`services/books/service.ts`) — hoisted closures:**
- `computeCandidates(bookId): Promise<PositionSource[]>` — load non-deleted assets; filter page-unit + strict-int + `total_pages>0`; map each to `{assetId, format, nativePosition, progress: Math.round(normalize(...)*100)}` (store the rounded 0–100 in `PositionSource.progress` for `sources` + comparison). Drop non-candidates.
- `resolveClash(bookId, sources): Promise<number | 'conflicted'>` — distinct-value check; agreement ⇒ value; clash ⇒ read rule, apply BR-BK-S8-5 (`last_valid` tie-break: sort by `updated_at` desc then `id` desc).
- `getUnifiedProgress(bookId)` — load book (`BookNotFoundError`); `resolveProgress`-style: `book.progress != null` ⇒ clamp 0–100 return; else `computeCandidates` → `[]`⇒null, else `resolveClash`.
- `getConflicts(bookId)` — load book (`BookNotFoundError`, parity); `computeCandidates`; if `resolveClash` ⇒ `'conflicted'` return `[ConflictItem]` else `[]`.
- `resolveConflict(id, choice)` — parse `conflict:<bookId>` → load book (`BookNotFoundError`); if `choice.rule==='source_of_truth'` assert `assetId` ∈ non-deleted assets (`BookAssetNotFoundError`); then `if (preferences) await preferences.setConflictRule(bookId, choice)` **else no-op** (the `revokeLookupGrant` pattern). **No `PositionConflictPending` throw** — a valid preset that can't apply yet (`photo_valid`) persists and the book stays `'conflicted'`.
- `getBook` — replace `unifiedProgress: null` with `await getUnifiedProgress(id)`.

**Errors (`services/books/types.ts` or errors file — the house pattern):** `PositionConflictPending` (exported, forward seam — thrown at S9); reuse `BookNotFoundError`, `BookAssetNotFoundError`. **No new error** — absent-port write is a no-op, not a throw (doc-grounded correction).

**Export** all three methods in the returned object (`service.ts:977-990` block).

---

## §6 g1 resolution (interpretations pre-grounded in the corpus)

| Potential g1 flag | Resolution (grounded) |
|---|---|
| "Why not `rollup()` across assets?" | Assets are competing measurements of ONE work's progress, not weighted children — BK-8 makes disagreement a *conflict*, not an average. `rollup` is for parent/child pursuables (purposes/targets), not same-work copies. `[business-rules.md:38-40]` |
| "epub/audio excluded = under-building?" | The cross-format mapping that normalizes non-page units is **unbuilt at M1** (BK-4; `getMappedPosition` always `not-synced`). Including them would require a guessed position — explicitly forbidden (fail loud). Honest M1 set. `[business-rules.md:23-30]` |
| "`PositionConflictPending` throw-site invented?" | **Fixed (g1 B1).** Not thrown in S8 — a conflict is a non-throwing `'conflicted'` flag. The error is the signal for a consumer that NEEDS a definite number; the first is S9 `getReadingMeasureSource`. S8 exports it as a forward seam, documents the S9 throw-site, and throws nothing. Presetting a forward-looking rule (`photo_valid`) is a legitimate successful write, not an error (BK-8). `[seam-contract.md:58; BK-8; interpretation.md:153-156]` |
| "absent-port write — fail loud or no-op?" | **Doc-grounded to no-op (Victor directive "ground everything in the docs").** My first draft invented `PreferencesUnavailableError`; the docs forbid it: `types.ts:77` ("absent ⇒ permissive, a convenience policy not a security gate; real keys M2/P6") + the `revokeLookupGrant` precedent (**BR-BK-S2-6**: "no dep ⇒ no-op"). Absent port ⇒ silent no-op; the real write lands M2/P6. **No new error type.** `[types.ts:76-77; BR-BK-S2-6; interpretation.md:60]` |
| "`resolveConflict` silently persists a bad `source_of_truth`?" | **Fixed (g1 B2).** The write validates `assetId` ∈ the book's non-deleted assets → `BookAssetNotFoundError`. A read-side "asset not currently in the clash" (positions moved) stays a benign `'conflicted'`; a write-side "asset that can't exist" is a structural error. `[business-rules.md:38-40]` |
| "conflict rule per-book vs global?" | Modeled per-book (the conflict is per-book; mirrors BK-7 per-book>global precedence). A global-rule fallback is an M2 Preferences-schema concern (real keys = M2). `[types.ts:75-77]` |
