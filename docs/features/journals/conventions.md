<!-- Conventions — features/journals · /documentation Phase 2 · sources: journal-service.ts (0 lines) · note.ts · notes-and-pages/* · sessions-and-scheduling (dueIn) · CLAUDE.md conventions · docs/intake/journals.md -->

# Conventions — Journals  (level: Feature / integration layer)

> INTENDED (`journal-service.ts` = 0 lines). Journals is the aggregation engine; build it as a **registry
> consumer**, the same seam used for `dueIn`, Session effects, and study-methods.

## How to build here
- **Aggregate via the registry; name no module.** `journal-service` iterates registered contributions
  (`summary(date)` + `dueIn(range)`). NEVER `import` a feature module to read its data — that re-creates the
  god-context + the dependency cycle JR-2 forbids. A new module appears by registering. `[FACT: JR-3; ADR-004 dueIn]`
- **Providers are date-keyed.** A `summary(date)` contribution MUST answer purely from data keyed to that
  date, so a snapshot is a faithful record (JR-7). If a source can't answer "as of date X", it does not belong
  in the summary. `[FACT: JR-7]`
- **Past = snapshot, today = live.** Read `journal_snapshots` for a past day; re-aggregate live for today.
  Never recompute a past day from current data as if it were the record (that erases improvement). Offer the
  live comparative as an explicit overlay, not the default. `[FACT: JR-6]`
- **Present, don't compute.** Reviews render `analytics.ts` output over a period; never re-implement metric
  math here. `[FACT: JR-10]`
- **Fill the block, don't own the page.** Journals produces the summary/agenda blocks; Notes & Pages owns the
  `pages` row, NP-2, the editor, and `[[links]]`. Never write the journal row or re-declare NP-2. `[FACT: JR-1]`
- **Degrade per section.** A failing provider blanks ITS section (explicit empty/error), never the journal. `[FACT: JR-1 fail-loud]`

## Naming & layout
- The engine is `journal-service`; the frozen record is `journal_snapshots` (not "journal_history"); a
  module's hook is a **journal contribution** (`section_key` + `summary(date)`).
- Reuse the `dueIn(range)` name for the agenda (shared with Sessions/Calendar) — do not invent a parallel.
- Follows platform conventions: UUIDv7 TEXT PKs · Unix-ms timestamps · `YYYY-MM-DD` for `snapshot_date` ·
  `-- [E]` on `sections_data` · `_sync_*` on `journal_snapshots` · JSON-as-TEXT for section data. `[FACT: CLAUDE.md Conventions]`

## Landmines / local "never do"
- **The engine is a stub — never cite it as behaviour.** `journal-service.ts` = 0 lines; docs describe INTENDED. `[FACT: wc -l = 0]`
- **Do NOT duplicate the Notes & Pages journal-page docs.** NP-2, the `/summary` block, the free-form entry,
  and `summary_config` live there — reference, never restate or contradict. `[FACT: notes-and-pages/*]`
- **Do NOT couple to modules by name.** Registry only (JR-3). If you're writing `if (module === 'habits')`,
  stop — it belongs in a contribution.
- **Do NOT make Notes & Pages depend on Journals.** The foundation stays below; the engine sits above (JR-2).
- **Do NOT treat the review as live.** A review reads snapshots (frozen); live comparative is opt-in (JR-6/JR-8).
- **Forward-deps are stubbed, not faked.** Purpose/Gamification/Notifications contributions don't exist yet —
  document the seam, mark them ⚠ forward-dep; never fabricate their data. `[INTENT: sweep]`
- **Views deferred.** Calendar/List/Gallery + the Wrapped review UI are the standing build-time VIEWS pass —
  do not fabricate view behaviour. `[INTENT: J5]`

## Completion checklist
- [x] patterns in use (INTENDED, marked; registry-consumer recipe) · [x] naming & layout · [x] landmines
  (god-context, cycle, N&P duplication, live-past) · [x] [FACT]/[INTENT] on each claim
