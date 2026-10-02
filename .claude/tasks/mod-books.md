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
  folded) → /critique SHIP → §XXIX currency (BR-BK-S6-1..8). Commit `_(pending)_`.
- [ ] S7 plans · S8 progress/conflict · S9 Education/measurement · S10 integrations/Journal
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

## Next Slice — S7 (Reading plans / Quota Planner)
S7 scope (BOO-27/28/29/30/31/32/33, slice-map.md:21): `reading_plans` + `reading_plan_books` junction CRUD +
goal-as-Purpose-target (**NO stored measurement axes — C-M1**, `reading_plans` holds none; Books names the axes,
stores none) + quota/auto-goal/projection derivations (Calendar reconciliation stubbed = forward dep) +
`TargetUnreachableProposal` (recalc can't meet target → options, never a silent rewrite, BK-11). `createPlan` ·
`getTodayQuotas` (Hub + Journal `/summary` provider) · `recordQuotaProgress` · `recalculate` · `getProjection`.
**Books owns plans; consumers consume (BK-12)** — the Study Planner reads via a provider, never writes. Reload:
`docs/features/books/delivery/{slice-map,seam-contract}.md` (S7 rows) · `docs/modules/books/current-*` ·
`parts/books.md` BOO-27..33 · `business-rules.md` BK-11/BK-12 · `rerun C-M1 books.md:71` (no stored axes) ·
`schema/books.ts` `reading_plans`/`reading_plan_books` (NO measurement_kind/binding_mode) · `foundation/measurement`
(the goal-as-target derivation seam). Env: Node 24 via nvm (stray non-24 `pnpm test` → rebuild better-sqlite3: `cd
node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npm run build-release`). Branch `mod-books`.
