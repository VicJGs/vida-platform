<!-- Contract — features/check-ins · /documentation Phase 2 · sources: ADR-002 §5.13 · CLAUDE.md §9 · intake -->

# Contract — Check-ins  (level: Feature)

> **Status:** ZERO CODE — there is **no `@vida/types` check-in file** and **no `@vida/core` model/service**; only
> the ADR-002 §5.13 schema exists. Signatures below are the **designed interface**, derived from the schema +
> intake; all are ⚠ to-be-built, and the INTENDED items depend on the ADR-002 amendment/fix. `[FACT: packages
> survey — no check-in types/model; ADR-002 §5.13]`

## Exposed surface (via `@vida/core`)
- **Check-in entries** (`DailyCheckIn` — type TBD):
  - `createCheckIn({date, type, template_id, ...})` — enforces one per (date, type) (CK-2) ·
    `updateCheckIn(id, patch)` (re-feeds Journal day page, CK-7)
  - `getCheckIn(date, type)` · `listCheckIns(range)` (history/calendar) · `getActiveTemplate(type)` → default
    if none customized (CK-4)
- **Templates** (`CheckInTemplate` + `CheckInTemplateQuestion`):
  - `createTemplate` · `updateTemplate` · `addQuestion`/`reorderQuestions`/`removeQuestion` (UNIQUE field_key,
    CK-5) · `setSchedule(templateId, {schedule_type, days, preferred_time})` (CK-8)
  - `seedDefaultTemplates()` → one per check_in_type (CK-3/CK-4)
- **Trends & reviews:**
  - `getMoodEnergyTrend(range)` → datasets for the dashboard tab (CK-1 plaintext scales) `[FACT: L979]`
  - ⚠ `getReviewData(type)` → aggregates Purpose/Project/Task progress for weekly/monthly/yearly reviews (CK-6)

## What it consumes (outside dependencies)
- **Notes & Pages / Journal** — a check-in links to its day's `pages` row via `entity_links`
  (`entity_type='daily_check_in'`); the Journal day page is filled from check-in responses (CK-7). `[FACT:
  ADR-002 L1350; INTENT G10]`
- **Preferences + Notifications** — per-type/per-template schedule fires reminders (CK-8). `[INTENT G8]`
- **⚠ Purpose / Projects / Tasks (cross-wave, INTENDED)** — review check-ins read goal/project/task progress
  through integration points (§6); contract finalized when those modules are documented (CK-6). `[INTENT G7]`

## Fed by (parent-module links — read via integration points, §6)
- **Independent domain (Wave 1)** — no upstream owner; check-ins are created standalone (or prompted by a
  reminder). `[FACT: docs/core/architecture/module-dependency-graph.md]`

## Consumed by
- **Journal `/summary`** → today's check-in (mood/energy + entry) surfaced in the daily dashboard (CK-7). `[INTENT
  G4; FACT: Notes /summary]`
- **Gamification** → streak/completion events (⚠ INTENDED, CK-11). `[INTENT G9]`
- **Purpose** → a review check-in can satisfy/contribute to `target_reviews` (⚠ INTENDED, CK-6). `[INTENT G7]`

## Contract error cases
- `createCheckIn` for an existing (date, type) → typed `DuplicateCheckInError` (CK-2). `[INTENT G2]`
- `addQuestion` with a duplicate `field_key` → typed error (UNIQUE template_id, field_key, CK-5). `[FACT: L3282]`
- `getReviewData` when a module read fails → returns partial + a flag, never a falsely-complete review (CK-6). `[INTENT G7]`
- A scale answer outside min/max → typed validation error (CK-5). `[INTERP CK-5]`

## Completion checklist
- [x] exposed + consumed + fed-by + consumed-by · [x] types/errors cited · [x] integration via documented points (no direct table access) · [x] [FACT/INTENT] each claim · [x] not-yet-coded + INTENDED flagged
