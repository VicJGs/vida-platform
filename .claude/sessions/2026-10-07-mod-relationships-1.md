---
Session 1 — 2026-10-07
Goal: mod-relationships ① backend (#56, LIF-137) — the personal CRM, PII-heaviest module
Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow ①)
---

## Accomplished
- **① backend COMPLETE — `createRelationshipsService` over DB-4 `025_relationships` (8 tables), all 9 slices, 59 legs REL-01…59. PR #107 merged to `main` (`39ccdab`).**
  - S1 contact CRUD spine + DB-11 `@vida/types` reconcile (dropped phantom `Contact.tags`; +NetworkGroup/NetworkGroupContact + G8 fields) · S2 interactions ledger + derived contact stats (RL-3 recompute) · S3 events (recurring MM-DD occurrence projection) · S4 reminders + groups + `getDueReminders` (R7 `dueIn` producer) · S5 networks + neural-graph data-prep · S6 derived health engine (closeness-weighted onion; **not** an ADR-011 measurement — C1) · S7 device import (deny-safe X1/X8) · S8 tags (entity_tags via Spaces) + pages (Notes) + links · S9 Journal `/summary` + sessions DueProvider lane (PULL-only).
  - Each slice: full Entity Delivery Flow (spec `/critique` → `/preflight` → gate-2 → live-store Verification → g2 review → §XXIX currency → per-slice commit). Independent critics SHIP'd the decomposition, S1, S4, S6.
- Quality: tsc 0 · eslint 0 · relationships **50/50** · full `@vida/core` **1899/1900** (1 = known vault-1MB infra flake). Currency docs born at `docs/modules/relationships/current-*`; per-slice specs at `docs/specs/foundation/mod-relationships/`.
- Composes the built substrates (spaces · notes · sessions/dueIn · ingestion) — no re-implementation.
- Worktree-isolated the whole build (parallel fe-codec session on the shared tree); close-out done in a throwaway worktree off `origin/main` to avoid clobbering it.

## Decisions Made
- **Schema is the floor, not the intake docs.** The aspect docs + decomposition + rerun flagged networks/closeness/snooze/anchor/G8 as "⚠ INTENDED / ADR-002 amendment"; the DB-4 schema had already authored all of it → built them (not deferred). The rerun was a pre-schema doc-realignment unit.
- **Health is a derived analytic, NOT a measurement (C1).** No `measurement_kind`/`binding_mode`, no source-registry advertise. Formula designed at build (the homed UNKNOWN): closeness onion from `relationship_type`+`is_favorite` (`closeness_tier` is OPEN vocab → display-only).
- **`getDueReminders` = the sessions `DueItem[]` producer** (fits the seam directly; S9 registers it). Biweekly+ schedule-group recurrence can't be projected (no phase-anchor column) → a grounded gap flagged forward, NOT a manufactured cut.
- **Device import = deny-safe pure pipeline (M1); bridge/store/grant = M2.** Finance-shaped ingestion reconcile doesn't fit contacts → a contact natural-key matcher.
- **PULL-only fan-out** (Journal registry + DueProvider); no effect-rail PUSH (C1 no measurement, C2 no economy).

## Open Questions
- none blocking. ② `fe-relationships` is a separate P6 unit. Biweekly+ schedule-group recurrence + device bridge + import_staging store + X2/X5 grant = M2 (documented seams).

## Next Session
First step: next `#`-order backend head = next M1.1.2 module via `/begin` (consult `reconstructed-structure.md`). Fresh branch/worktree off main.
Context to reload: `docs/modules/relationships/current-*` (if touching relationships again); otherwise the next module's 5 aspect docs + `backend-intent/parts/<module>.md` + schema. **Env: Node 24 for @vida/core tests** (better-sqlite3 ABI — a review agent rebuilt it to 24 this session; standardize on 24).
