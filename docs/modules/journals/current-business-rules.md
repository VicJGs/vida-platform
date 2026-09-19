<!-- CURRENT-BUSINESS-RULES — module: journals · born D6 (§XXIX Currency Rule) at mod-journals #39 Slice 1.
     Ground truth for /critique + /preflight. Reflects SHIPPED invariants; unbuilt slices' rules flagged PENDING. -->

# Journals — Current Business Rules (as-built)

Inherits the CORE constitution (ZK-1, LF-2) + Notes & Pages' journal-page rules (NP-2, `/summary` block, G7).
Journals owns the ENGINE behind the block; it never re-declares the page rules (JR-1). Source: `docs/features/journals/*`.

## SHIPPED — Slice 1 (registry + types)
- **BR-S1-1 · The journal names no module (JR-3).** A contribution's `module` is a plain `string`; the registry
  imports no feature module. Prevents the god-context + the JR-2 cycle. `[FACT: business-rules.md:17-19]`
- **BR-S1-2 · Deterministic iteration (IR-a2).** `list()` returns contributions in a fixed order — `sectionKey`
  (`summary→agenda→entry`) then `module` asc — never Map-insertion/registration order. A non-deterministic order
  would render the same day differently per device (ZK multi-device) + break snapshot reproducibility (JR-7).
- **BR-S1-3 · Dedup by `module` — re-register OVERWRITES.** The `module` key is self-owned (only that module
  registers under it), so a second register is an idempotent re-wire, not a collision. Deliberately unlike
  `EffectRegistry` (shared `effectType` key → throws). `[FACT: foundation/effects/registry.ts:23]`
- **BR-S1-4 · `TerminalState` is REUSED, never redefined.** `SectionData.state` = the `@vida/core` canon
  `['loading','empty','error','success']`; the docs' "populated" prose maps to `success`. No 5th state, no local copy.
- **BR-S1-5 · Types live in `@vida/core`, not `@vida/types`** — layering (`SectionData.state` references the
  `@vida/core` canon; `@vida/types` can't import up). `JournalSummaryConfig` stays in `@vida/types/note.ts`.
- **BR-S1-6 · Typed errors, fail-loud.** The 4 contract errors are `Error` subclasses with stable `.name`.
- **Edge:** empty registry → `list()` = `[]` (a module with no contribution is simply absent, not an error,
  `business-rules.md:48`); `get(unknown)` → `undefined`.

## SHIPPED — Slice 2 (dashboard engine + pure selection)
- **BR-S2-1 · Deterministic assembly.** `buildDashboard` iterates `registry.list()` (deterministic) and preserves that
  order within `summary` / `agenda`.
- **BR-S2-2 · Per-section degrade, never a blank journal (IR-d).** Each provider call isolated in try/catch → a throw
  yields a degraded `{state:'error'}` section; assembly continues; `buildDashboard` never throws for a provider failure.
- **BR-S2-3 · `resolveSelection` — override wins per module, no module dropped (BR-6).**
- **BR-S2-4 · Selection filters the summary recap's advertised dataPoints** (`id ∈ selection[module]`); omitted/absent → all shown.
- **BR-S2-5 · Section membership is by producing method** (summary()→`summary`, dueIn()→`agenda`); `sectionKey`
  normalized on each result; a contribution with no `dueIn` yields no agenda section; agenda is NOT selection-filtered
  (shared `dueIn` surface). `JournalContribution.sectionKey` = the S1 ordering key only (assumption-A retired).
- **BR-S2-6 · Async providers awaited** (still isolated per BR-S2-2).
- **BR-S2-7 · `journalStillRenders`** — false only when EVERY section errored (anti-blank, BR-3).
- **SEAM (N-3):** persisted `getSelection`/`setSelection` — need a Preferences journal-selection field + the
  `summary_config` per-module generalization (schema changes out of ①). `buildDashboard`'s param + `resolveSelection`
  cover the runtime need meanwhile.

## SHIPPED — Slice 3 (snapshot store + service shell)
- **BR-S3-1/2 · A snapshot freezes the FULL (unfiltered) SUMMARY only** — never the agenda (JR-7 faithful record;
  selection is a read-time filter, IR-e2).
- **BR-S3-3 · Single-row write; `encryptedFields:[]` (M1.0); `initVault()` required** (sync-hash path runs even with
  empty [E], IR-a); no `softDelete` (table has no `deleted_at`).
- **BR-S3-4 · `getJournal` — snapshot-if-exists (latest `captured_at`, no UNIQUE) else live**; realizes JR-6 today=live
  under the past-day capture policy (strict tz-aware today = design-pass).
- **BR-S3-5 · Malformed `sections_data` degrades to live — never crashes** (N-4).
- **BR-S3-6 · `withLiveComparative` attaches a live overlay** to a snapshot view (opt-in, JR-6).
- **BR-S3-7 · Snapshots immutable** (no update/delete; re-capture-on-backfill = design-pass).
- **BR-S3-8 · A capture freezes degraded (error) sections as-is** (faithful record; retry/skip = design-pass).
- **BR-S3-9 · `journal_snapshots` = the first reduced-column table via the Repository** — `create()` succeeds (Drizzle
  drops the phantom `created_at`/`updated_at` keys) but its RETURN carries them; `captureSnapshot` builds the view
  explicitly. [FACT: probe 2026-09-19]

## SHIPPED — Slice 4 (buildReview compose-skeleton) — ① BACKEND COMPLETE
- **BR-S4-1 · Reviews compose in-range snapshots** (`snapshot_date ∈ [from,to]`, latest-per-date, ordered).
- **BR-S4-2 · Insufficient history is EXPLICIT** — `buildReview` throws `InsufficientHistory` when the period has no
  valid snapshot (the backend signal the UI maps to the insufficient-data terminal state).
- **BR-S4-3 · Compose, don't compute (JR-10)** — returns a `{period, snapshots}` shell; Wrapped trajectory + the
  `analytics.ts` presentation = design-pass.
- **BR-S4-4 · Named-period → range math = design-pass** — the skeleton takes an explicit `{from,to}`.
- **BR-S4-5 · Scheduling/delivery = design-pass** — no `schedule` param in the skeleton (Wave 4).
- **BR-S4-6 · Malformed snapshots skipped** (a bad blob doesn't abort the review; reuses S3 `parseSummary`). — `buildReview` composes in-range snapshots (skeleton); `InsufficientHistory` explicit;
  presents `analytics.ts` output, never recomputes. Wrapped math + scheduling/delivery = design-pass (Wave 3/4).

## Invariants that hold across all slices (JR-1 boundary)
- NEVER write the journal `pages` row, re-declare NP-2, or own the `/summary` block / free-form entry (Notes & Pages).
- NEVER import a feature module by name — depend only on `JournalContribution` (registry decouples).
- NEVER recompute metric math owned by `analytics.ts` — present only.
