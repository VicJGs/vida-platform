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
- [ ] S3 assets + mapping · S4 annotations · S5 quote-embed · S6 sessions + registerBooks · S7 plans · S8
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

## Next Slice — S3 (assets + positions + mapping absent-state)
S3 scope (BOO-09/10/11/12/44, slice-map.md): `book_assets` CRUD · `attachment?` deny-safe upload (⇒
`attachment-unavailable`) · `updatePosition` SSOT (per-asset `native_position`) · `getMappedPosition` →
`NotSyncedState` (synced|pending|failed; never guessed — fail loud, BK-4) · `AssetFileError`. **Fold carry-fwds:**
N1 (replace `BookView.assets: BookAssetRow[]` with a proper `BookAsset` @vida/types interface) + B1 (consider
surfacing chapters when `BookView` expands — the chapter READ path). Reload: `docs/features/books/delivery/*` ·
`docs/modules/books/current-*` · `parts/books.md` BOO-09..12/44 · `schema/books.ts` (book_assets) ·
`foundation/ingestion`-style `attachment?` port precedent. Env: Node 24 via nvm. Branch `mod-books`.
