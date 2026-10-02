# Task: mod-books
# Status: in-progress
# Linear: LIF-117
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Source: reconstructed-structure.md (Phase V `#51`, LIF-117; ADR-016 model)

## Goal
Books — the Books module ① backend service tier (`createBooksService`) over DB-4 `023_books`
(`books` + `book_chapters` + progress/bookmarks/notes), composing the knowledge review engine,
the measurement source-registry seam, sessions, journals, notes-and-pages, and spaces-tags-links.
Entity Delivery Flow (v1): front matter (interpretation + decomposition) → per-slice service track.

## Dependencies
- blocked by `mod-journals` ✅ Done
- blocked by `mod-knowledge` ✅ Done
- blocked by `mod-notes-and-pages` ✅ Done
- blocked by `mod-sessions` ✅ Done
- blocked by `xs-ai` ✅ Done
- blocked by `xs-ingestion` ✅ Done
- blocked by `xs-measurement-engine` ✅ Done
- blocked by `xs-spaces-tags-links` ✅ Done
(all blockers Done — #51 READY)

## Build Steps (Entity Delivery Flow — Default scenario)
- [x] Step 0: document-context BASELINE — corpus read; seams verified in built @vida/core
- [x] Step 1: Interpretation layer — delivery/interpretation.md (6 seams + 7 deny-safe ports + 8 implicit rules)
- [x] Step 1.5: Envision Gate — N/A (pure-backend; stated)
- [x] Step 2: Decomposition Gate — slice-map (48 legs → 10 slices) + seam-contract → **Approval 1 ✅** (critic REVISE→folded; deferrals doc+substrate grounded per Victor)

### Slices (per-slice §XXVI double-gate + live-store Verification Gate + code-review + currency)
- [x] **S1 — Works CRUD + reframe** (BOO-01/02/03/48): createBooksService + `books` table CRUD; Book interface
  reconciled (DB-11); progress-never-settable reframe; 7/7 live-store; code-review SHIP; @vida/core 1440 green.
- [x] **S2 — Chapters/TOC + ISBN lookup port** (BOO-05/06/07/08 + N3): `setChapters` declarative upsert (tracking
  preserved, absent pruned, no deleted_at) + UNIQUE pre-check · `markChapterComplete` + `ChapterNotFoundError` ·
  deny-safe `ingestion?` `lookupBook`/`revokeLookupGrant` (`BOOKS_ISBN_INTEGRATION_ID`, fail-closed, M2 normalization)
  · `plannable` honors TOC. g1 (5 resolutions) → 20/20 live-store → 3-finder code-review (3 fixed / 1 documented /
  1 carry-fwd) → §XXIX (BR-BK-S2-1..7 + F4 drift fixed). Commit `547c889`; books 20/20, tsc 0, eslint 0.
- [x] **S3 — Assets + positions + mapping absent-state** (BOO-09/10/11/12/44 + N1/B1): `book_assets` CRUD
  (`addAsset` deny-safe `attachment?` upload / fail-loud `AssetFileError` · `updatePosition` SSOT · `removeAsset`
  soft-delete) · `getMappedPosition`→`MappedPosition` (BK-4 never-guessed, M1 always `not-synced`+target native) ·
  N1 `BookAsset` @vida/types interface · B1 chapters on `BookView` (closes S2 chapter-READ). g1 (4 pts grounded in
  the corpus) → 31/31 live-store → 2-reviewer SHIP (4 NITs folded, incl. seam-contract realign) → §XXIX
  (BR-BK-S3-1..8). @vida/core green, tsc 0, eslint 0. Commit `133ddef`.
- [x] **S4 — Annotations + notes/links** (BOO-15/16/17/18/19/20): `book_bookmarks`/`book_highlights`/`book_quotes`
  CRUD + N-fold @vida/types interfaces · `addHighlight` derives book_id from asset · `linkAnnotations`
  (`spaces.createLink`) + `openAnnotationNote` (`notes.ensureEntityNote`) composing the REAL substrates ·
  BK-6 highlight-exclusion enforced via `assertLinkable`→`AnnotationNotLinkableError` (both endpoints — the registry
  backstops the target only; Verification-Gate-caught, §XXVIII) · `listAnnotations`/`listQuotes`. g1 (4 pts grounded)
  → 40/40 live-store (REAL spaces+notes) → 2-reviewer SHIP (1 NIT folded) → §XXIX (BR-BK-S4-1..8). @vida/core
  **1473/1473**, tsc 0, eslint 0. Commit `d4dfef2`.
- [x] **S5 — Quote-embed feed + toggles** (BOO-21/22): `getEmbeddableQuotes({bookId?})` — live `BookQuote` rows
  (never copied, soft-delete filtered) with **per-book > global** toggle precedence (`override ?? global`) via a
  NARROW deny-safe `preferences?` port (2 reads, NIT-3; absent ⇒ permissive fail-OPEN, the habits precedent) ·
  SCOPED toggle-off ⇒ `QuoteEmbedDisabledError`, GLOBAL feed EXCLUDES toggle-off books (no throw) · `PreferencesPort`
  + `QuoteEmbedDisabledError` types. Read-only, schema-less (no migration, no `@vida/types` change). g1 (SHIP, 2
  folds) → 48/48 live-store (incl. 2 reviewer-NIT edges) → 2-reviewer SHIP (0 blockers) → §XXIX (BR-BK-S5-1..5).
  @vida/core **1479/1479**, tsc 0, eslint 0, gitleaks clean. Commit `f81bd24`.
- [x] **S6 — reading sessions + Reader orchestration + registerBooks SHIPPED** (BOO-23/24/25/26/39):
  `createSession('reading')` composition + Books `reading_sessions` extension + `registerBooks()` (ADR-004 §3.2
  transcription, empty envelope C-E2) + `startSession`/`endSession`/`attachPhoto` (deny-safe `attachment?`/`ai?`,
  photo-always-stores BK-10)/`getStatistics` (derived)/`openReader` (BOO-39 service face, decrypt+auto-session+
  position). New required deps `sessions`+`sessionRegistry`; new optional `ai?`; `AttachmentPort.download` additive;
  `@vida/types ReadingSession` N-fold. Full Entity Delivery Flow: PLAN → g1 /critique REVISE→SHIP (5 folds) →
  **doc-first re-ground (Victor: "docs leave nothing to build phase" — ADR-004 §3.2.1 attach=book · §3.2.2+C-E2
  effects=[] · §3.2.3 lifecycle · intake B10/B16)** → Approval 1 → /api-contract ratify + /adr-check (no ADR) →
  /preflight PASSED (R10 non-atomic compose · R11 timing read) → Approval 2 → implement → **tsc 0 · 63/63 live-store
  (REAL sessions, Node 24) · full @vida/core 1495→1496 · eslint 0 · gitleaks clean** → code-review SHIP (2 NITs
  folded) → /critique SHIP → §XXIX currency (BR-BK-S6-1..8). Commit `92e5b30`.
- [x] **S7 — Reading plans / Quota Planner SHIPPED** (BOO-27/28/29/30/31/32/33): `createPlan` (Books-owned, atomic
  plan+junctions, **NO measurement axes** per C-M1 — Purpose-owned/unbuilt) + auto-goal/quota-distribution
  derivation (days-until-target arithmetic; Calendar reconciliation stamped-stub) + `getTodayQuotas` (derived Hub +
  Journal provider) + `recordQuotaProgress` (idempotent per sessionRef) + `recalculate` (reshape silently on/ahead;
  **`TargetUnreachableProposal`** behind pace — extend_date/raise_quota, never silent rewrite, BK-11) + `getProjection`.
  **NO new deps** (self-contained). First slice to WRITE json<T> (`quota_distribution`/`recalculation_state`). New
  `@vida/types` `ReadingPlan`+`ReadingPlanBook`; errors `ReadingPlanNotFoundError`+`TargetUnreachableProposal`. Full
  Entity Delivery Flow (all doc-grounded per standing directive): PLAN → g1 /critique REVISE→SHIP (1 fold: recalc
  proposal condition = behind-planned-pace) → Approval 1 → /api-contract ratify + /adr-check (no ADR) → /preflight
  (atomic createPlan via createInTx · asOf seam no clock dep) → Approval 2 → implement → **tsc 0 · 72/72 live-store
  (Node 24) · full @vida/core 1505 · eslint 0 · gitleaks clean** → code-review SHIP (1 fix: recordQuotaProgress
  session guard) → /critique SHIP → §XXIX currency (BR-BK-S7-1..8). Commit `a9aa79f`.
- [x] **S8 — Unified progress + conflict resolution SHIPPED** (BOO-13/34/35): `getUnifiedProgress`→`number|'conflicted'|null`
  (derive-on-read via `measurement.normalize`+`resolveProgress`; page-unit {pdf,physical,braille} only; override slot
  inert) · `getConflicts` derived queue (NO table, `id=conflict:<bookId>`) · `resolveConflict` persists BK-8 preset rule
  via `preferences?` (absent ⇒ **no-op**, revokeLookupGrant precedent) · `PositionConflictPending` exported typed
  vocabulary (NO M1 throw-site) · `BookView.unifiedProgress` widened + `getBook` composes. **Victor "ground everything
  in the docs" → invented `PreferencesUnavailableError` removed** ([[absent-deny-safe-port-write-is-noop-not-new-error]]).
  g1 REVISE→folded (B1/B2 +4 NITs) → Approval 1 → adr-check ALIGNED + preflight PASSED → Approval 2 → tsc 0 → 83/83
  live-store → code-review SHIP → /critique SHIP → §XXIX (BR-BK-S8-1..10). @vida/core **1516/1516**. Commit `aa9edec`.
- [x] **S9 — Education partition + measure source + tags + linkable-target SHIPPED** (BOO-04/14/36/37/38/46):
  `scopeTag` (compose `spaces.tagEntity('book')` + `TagNotFound` guard) · `linkSubject`/`unlinkSubject`/`listBooksForSubject`
  over `book_subjects` (idempotent app-layer — **no schema UNIQUE**; faithful-row re-read) · `getPaceStatus`→**deny-safe
  null** (Education `#52` unbuilt, never fabricated) · `getReadingMeasureSource`→`ReadingMeasureSource{progress}` METHOD
  not advertise (KNO-25; `'conflicted'`⇒null) · BOO-46 identity-only (`backlinks` dep NOT wired). **NO new table/dep.**
  **Bundled S8 currency correction** (no silent drift): `PositionConflictPending` has NO M1 backend throw-site (grounded
  `contract.md:64` + `getMasterySource`). g1 REVISE→folded (B1 faithful-row +4 NITs) → Approval 1 → adr-check ALIGNED +
  preflight PASSED → Approval 2 → tsc 0 → 90/90 live-store → code-review SHIP (all 10 axes) → /critique SHIP → §XXIX
  (BR-BK-S9-1..8). @vida/core **1523/1523**. Commit `65384a9`.
- [ ] S10 integrations/Journal (the FINAL slice → PR when ① complete)
- [ ] Step 3: read 3 existing MOD services — state the pattern
- [ ] Step 4: /api-contract (service API) approved before code
- [ ] Step 5–6: /adr-check · /adr-new (if significant)
- [ ] Step 7: implement types → service logic → error handling → D6 birth docs/modules/books/current-*
- [ ] Step 8: tsc --noEmit zero errors
- [ ] Step 9: per-slice BLOCKING Verification Gate (Vitest + live-store smoke) before next slice
- [ ] Step 10: code-review → /critique → SHIP
- [ ] Step 11: Currency Rule (§XXIX) — refresh current-* + commit WITH code

## On Failure
1. Always invoke victor:triage first — classify before any fix attempt
2. Check .claude/knowledge/failure-patterns/known-failures.md for this exact error
3. If not documented: solve it, then document per _template.md — before /session-end

## Route History
- 2026-09-30: activated (was `planned`) via /begin → next `#`-order head #51. Scenario = Default (Entity
  Delivery Flow v1). Starting at Step 0 (BASELINE documentation).
- 2026-10-01: S2 shipped (`547c889`) — chapters/TOC + ISBN lookup port + N3 fold. Full per-slice cadence
  (g1 → 20/20 live-store Verification Gate → 3-finder code-review → §XXIX currency). Next: S3 (assets +
  positions + R2 `attachment?` port + cross-format mapping absent-state). Branch `mod-books`.
- 2026-10-01: S4 shipped — annotations + notes/links (BOO-15/16/17/18/19/20). N-fold BookBookmark/Highlight/Quote.
  g1 critique REVISE→3 items grounded (captured_text snake_case books-convention; highlight-survival test = the
  no-FK hard case; openAnnotationNote seed). Composes REAL spaces+notes (live-gate exercises registry + idempotency).
  **BK-6 correction (§XXVIII, live-gate-caught):** g1 "registry-only enforcement" was incomplete — spaces.createLink
  validates only the link TARGET, not the SOURCE anchor → a highlight source would persist a link; added
  `assertLinkable`→`AnnotationNotLinkableError` (both endpoints, conventions.md:50). Also fixed an ENV failure: a
  stray Node-20 `pnpm test` recompiled better-sqlite3 to ABI 115 → rebuilt for Node 24 (ABI 137) via
  `build-release`. 40/40 books + **1473/1473** full suite. 2 independent reviewers SHIP. Branch `mod-books`.
- 2026-10-01: S3 shipped — assets + positions + mapping absent-state (BOO-09/10/11/12/44) + folds N1
  (`BookAsset` interface) + B1 (chapters READ path). g1 critique REVISE→4 points grounded in the corpus
  (Victor: "ground them in the documentation" — `addAsset` deny-safe-ABSENCE/fail-loud-FAILURE split via
  `business-rules.md:127`; annotation-survival→S4; BOO-44 S3 throw site; `readable` live-count + target
  native_position). 31/31 live-store → 2 independent reviewers SHIP (4 NITs folded incl. realign of `addAsset`
  to the frozen bundled `{format, file?}` seam-contract shape). Branch `mod-books`.
- 2026-10-02: S7 shipped — Reading plans / Quota Planner (BOO-27/28/29/30/31/32/33). Self-contained (NO new deps);
  first slice to WRITE json<T> columns (`quota_distribution`/`recalculation_state` — serialize/parse boundary).
  **C-M1 grounded (standing directive):** NO stored measurement axes — the pursuable goal is Purpose-owned (rerun
  `books.md:71`) and Purpose is unbuilt, so S7 takes no measurement/Purpose dep. `createPlan` atomic (plan+junctions
  via `createInTx`). `TargetUnreachableProposal` fires when behind the planned pace (g1 fold: the crisp condition vs a
  vague "sane ceiling"). code-review fix: `recordQuotaProgress` guards the session (no silent 0-credit). Calendar
  reconciliation = stamped stub (forward-dep). tsc 0, 72/72 books live-store (Node 24), full @vida/core 1505, eslint
  0, gitleaks clean. Currency BR-BK-S7-1..8. Branch `mod-books`.
- 2026-10-01: S6 shipped — reading sessions + Reader orchestration + registerBooks (BOO-23/24/25/26/39). Composes
  the REAL ADR-004 `sessions` spine (`createSession`/`completeSession`/`attach`) + AR-5 `SessionRegistry`; `reading`
  `SessionTypeDef` = a transcription of ADR-004 §3.2 (empty envelope, C-E2). **Victor drift-catch ×2 → doc-first
  re-ground:** I framed the envelope + attachment target as "docs leave to build phase, resolved by precedent";
  Victor "the docs leave nothing to be solved in the build phase … check." Re-grounded: attach=book (§3.2.1
  instance "about X"), effects=[] (§3.2.2 + C-E2 feeder-list), lifecycle (§3.2.3), intake B10/B16 RESOLVED. Memory
  [[adr-004-3.2-defines-all-session-subtype-dimensions]]. 5 g1 blockers folded (attach book-not-asset via
  `_registry.ts:87` + started_at stamp via `lifecycle.ts:117` + statistics M2-seam + SessionTypeNotFound name +
  minutesSpent semantics). 2 preflight resolutions (R10 non-atomic session+extension compose = eventually-consistent
  no-FK; R11 N+1 timing read). 2 code-review NITs folded. tsc 0, 63/63 books live-store (Node 24), full @vida/core
  1496, eslint 0, gitleaks clean. Currency BR-BK-S6-1..8. Branch `mod-books`.
- 2026-10-01: S5 shipped — quote-embed feed + toggles (BOO-21/22). `getEmbeddableQuotes({bookId?})` + narrow
  deny-safe `preferences?` port (2 reads, NIT-3) + `QuoteEmbedDisabledError`. Read-only, schema-less. Full per-slice
  Entity Delivery Flow: g1 /critique SHIP (2 folds — §6 throw-site resolution recorded + feed global-read hoist) →
  Approval 1 → /api-contract ratify + /adr-check (no ADR) → /preflight PASSED → Approval 2 → implement → 48/48
  live-store Verification Gate (Node 24) → **2 independent reviewers SHIP** (correctness + doc-faithfulness; 0
  blockers, 1 NIT folded = 2 added edge tests: global-off-no-overrides ⇒ [], empty-but-enabled ⇒ []) → §XXIX
  currency (BR-BK-S5-1..5, current-spec + current-business-rules). Decision: single-method design (throw on scoped,
  filter on global) — NO by-id resolve method added (frozen seam-contract honored, anti-over-engineering). @vida/core
  **1479/1479**, tsc 0, eslint 0, gitleaks clean. Branch `mod-books`; PR when ① (all 10 slices) completes.
- 2026-10-02: **S8 shipped** (`aa9edec`) — unified progress + conflict resolution (BOO-13/34/35). Derive-on-read via
  `foundation/measurement` (`normalize`/`resolveProgress`); derived conflict queue (no table); conflict preset rule via
  the deny-safe `preferences?` port. **Victor drift-catch "ground everything in the docs":** my g1 invented a fail-loud
  `PreferencesUnavailableError` for the absent-port write; the docs resolve it to a **no-op** (the `revokeLookupGrant`
  precedent BR-BK-S2-6 + `types.ts:77` "absent⇒permissive, real backing M2") → removed. Memory
  [[absent-deny-safe-port-write-is-noop-not-new-error]]. g1 also folded B1 (PositionConflictPending throw-site → forward
  seam) + B2 (source_of_truth asset validation) + 4 NITs. 83/83 live-store, @vida/core 1516/1516. Branch `mod-books`.
- 2026-10-02: **S9 shipped** (`65384a9`) — Education partition + measure source + tags + linkable-target
  (BOO-04/14/36/37/38/46). NO new table/dep (`book_subjects` already in `023_books`; composes `spaces` + S8). Scope =
  the 6 numbered legs (slice-map "classification" = the `scopeTag` write); `listBooks`/`listQuotes` tag-filter
  completions stay carry-forward. `getReadingMeasureSource` = method not advertise (KNO-25); `getPaceStatus` deny-safe
  null (Education `#52`). **§XXIX no-silent-drift:** reading `contract.md:64` (the intent authority) corrected my S8
  claim that `PositionConflictPending` is "thrown at S9" — the measure source returns null, the on-write block is P6/M2,
  so it has NO M1 backend throw-site; fixed the S8 currency docs in this commit. g1 folded B1 (linkSubject faithful-row
  re-read) + 4 NITs. 90/90 live-store, @vida/core 1523/1523, code-review SHIP (all 10 axes). Branch `mod-books`.

## Next Slice — S10 (Integration close-out + fan-out + Journal) — THE FINAL SLICE
S10 scope (BOO-40/41/42/43/45/47, slice-map.md:24): **TTS/transcription** via the deny-safe `ai?` port
(`convertToSpeech`/`transcribeForMapping` → `OcrResult`, `ai-unavailable` when absent/denied) · **consent-gate
invariant** (`IntegrationConsentError` — the ADR-014 X-family consent) · **Study-Planner read-provider**
(`getPlansForConsumer()` → `ReadingPlan[]`; consumers consume, Books never lets them write, BK-12) · **local-first
invariant** (BOO-47) · **`effects?` fan-out** (measurement-only signal on reading-session completion — **C-E2: NO
economy grant on Books**; grants ride base-`sessions`) · **`registerBooksJournal`** (the Journal `/summary` PULL
contribution composing BOO-30's `getDayBooksDigest`/`getTodayQuotas` provider + the BOO-26 reading-session signal).
Completing S10 finishes ① → **open the PR for the whole backend track**.
Reload: `docs/features/books/delivery/{slice-map,seam-contract}.md` (S10 rows + the Journal digest block) ·
`docs/modules/books/current-*` · `parts/books.md` BOO-40/41/42/43/45/47 · `business-rules.md` (consent-gate, C-E2,
BK-12) · `interpretation.md` (the `ai?`/`effects?`/Journal-registry rows) · the knowledge S8 `registerKnowledgeJournal`
+ effect fan-out precedent ([[event-fanout-pull-push-split-and-occurrence-grain]]) · `foundation/ai` (deny-safe) ·
`foundation/effects` (rail). Env: Node 24 via nvm (stray non-24 `pnpm test` → rebuild better-sqlite3: `cd
node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npm run build-release`). Branch `mod-books`.
