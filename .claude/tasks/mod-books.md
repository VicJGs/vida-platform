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
- [ ] Step 0: document-context BASELINE — ground truth for books + the seam contexts it composes
- [ ] Step 1: Interpretation layer — delivery/interpretation.md (deps · needs · organization · implicit rules, [FACT])
- [ ] Step 1.5: Envision Gate — N/A (pure-backend; stated)
- [ ] Step 2: Decomposition Gate — delivery/slice-map.md + seam-contract.md + service/ spec set → Approval 1
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
