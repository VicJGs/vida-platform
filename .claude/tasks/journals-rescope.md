# Task: journals-rescope
# Status: planned
# Linear: LIF-244
# Profile: Add Frontend Component
# Scenario: entity-rescope
# Project: M1 — Whole Manual OS
# Milestone: M1.2.4 — Live Close: shipped-surface debt
# Source: golive-replan G2 debt-plan.md rev 3 + G3 g3-order.md
# Title: Journals live: EC-3 inline-block journal (early slices)

## Goal
Journals live: EC-3 inline-block journal (early slices). Run the entity through `entity-rescope` and close on the Entity Live Close
(`docs/specs/foundation/golive-replan/process.md` ELC-1…9): every pinned Envision EC (incl. inherited) re-verified live;
each ❌ EC corrected or explicitly re-pinned by Victor.

## Scope (census rows → `docs/specs/foundation/golive-replan/coverage-report.md`)
fe-home ❌ EC-3 (prose + inline blocks + reachable "/" hint) · home STUB legs not owned by HARD-1 · dead dup `home/journal-contribution.ts` · fake-success widget states · widget-selection storage + placement-edit Capability. Parent of journals-rescope-dashboard (⊕split)

## Ledger home
docs/features/journals/delivery/ — entity-rescope writes reconciliation.md + slice-map.md here

## Dependencies
- blocked by `data-plane-wiring`
- blocked by `notes-rescope`
- blocked by `preferences-rescope`

## Inbound from notes-rescope (2026-10-26, Victor: "the journals is supposed to be a module within it's own")
- **fe-notes EC-18a journal Overview** (+ ORPHAN#12) re-homed here from notes-rescope (coverage-report A·fe-notes·D·EC-18a; debt-plan row). Notes keeps the Overview SLOT (`apps/web/src/notes/overview-registry.ts`); register the journal Overview there and mount it as a COMPONENT (notes interpretation IR-R13).
- **Journal views** (Calendar/List/Gallery by week/month/year — `docs/features/journals/delivery/slice-map.md:88`, intake/journals.md:25-26) and **where a journal opens** when reached from `[[` / a link (its day surface) — no golive-replan home found; surfaced here as the owning entity's legs.
- Journal mode/arrangement = Home's Journal-first/Dashboard-first pref (fe-home RP2/RP4) — not a Notes per-type mode.
