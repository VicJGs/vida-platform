# services/journals — per-module business logic
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this module is
The Notes & Journals **integration layer** — the aggregation engine + provider registry behind the daily journal
dashboard. Owns the ENGINE, never the journal page (JR-1). ① backend built at mod-journals #39 (LIF-127).

## Owning ADR / context
notes-and-pages · docs/features/journals · ADR-004 (registry pattern). Currency:
`docs/modules/journals/current-{spec,business-rules}.md`. Delivery: `docs/features/journals/delivery/*`.

## Pattern
Factory-object service (`createJournalsService` → object literal; hoisted closures, never `this.`). Rides the DB-6
Repository (`encryptedFields: []` M1.0 pass-through) + the S1 in-memory registry; composes providers, does not import
feature modules by name (JR-2/JR-3 no cycle).

## Status (① BACKEND COMPLETE — S1–S4)
- `types.ts` — canonical contribution/engine types (reuse the @vida/core `TerminalState` canon — NOT @vida/types,
  which can't import @vida/core) + 4 typed errors.
- `registry.ts` — `createJournalRegistry` (ADR-004 factory; deterministic `list()`, overwrite-dedup by module).
- `selection.ts` — pure `resolveSelection` (override-wins per module); lifted from the UX-6 design model.
- `dashboard.ts` — `buildDashboard` (per-section degrade, deterministic, selection filter) + `journalStillRenders`.
- `service.ts` — `createJournalsService`: `captureSnapshot`/`getJournal` over `journal_snapshots` + `buildReview`.
- Tests: `__tests__/{registry,dashboard,journals-service}.test.ts` (33; the service suite is live-store).

## Seams / design-pass (documented, NOT built here)
Persisted `getSelection`/`setSelection` (no Preferences field / generalized `summary_config` yet — schema change, N-3) ·
module provider registrations (first-consumer-pull, JR-3) · the `apps/web/src/home` UX-6 placeholder migration
(fe-journals) · named-period→range math, Wrapped trajectory, `analytics.ts` presentation, review scheduling/delivery.
