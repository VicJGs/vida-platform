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
- [ ] S5 quote-embed · S6 sessions + registerBooks · S7 plans · S8
  progress/conflict · S9 Education/measurement · S10 integrations/Journal
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

## Next Slice — S5 (quote-embed feed + toggles)
S5 scope (BOO-21/22, slice-map.md): `getEmbeddableQuotes(scope)` — the quote-embed provider for the `@vida/editor`
block; **per-book > global toggle precedence** read from a deny-safe `preferences?` port (BK-7); embeds REFERENCE
the stored quote (never copy); a toggled-off book → `QuoteEmbedDisabledError`. **New dep:** `preferences?:
PreferencesPort` (optional, permissive default — the habits fail-OPEN precedent). Reload:
`docs/features/books/delivery/{slice-map,seam-contract}.md` · `docs/modules/books/current-*` · `parts/books.md`
BOO-21/22 · `business-rules.md` BK-7 · `conventions.md:22` · the S2 `ingestion?`/S3 `attachment?` deny-safe port
shape. Env: Node 24 via nvm (if a stray non-24 `pnpm test` runs, rebuild better-sqlite3: `cd
node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npm run build-release`). Branch `mod-books`.
