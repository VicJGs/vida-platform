# Intake — journals  (level: 2 — Dependent; the INTEGRATION LAYER — last Wave-2 context)

> Fill order: documented LAST in Wave 2 — it aggregates every module, so all its sources are now documented
> (Notes & Pages ✅ owns the journal page; Sessions ✅, Knowledge ✅, Education ✅, Habits/Tasks/Finance/
> Relationships/Check-ins ✅). Closes Wave 2.

## Current (enforced reality — authoritative source)

**A journal is NOT its own table** — it is `type='journal'` in the polymorphic `pages` table, and **Notes &
Pages (Wave 0) already documented the journal PAGE**:
- `pages` row with `type='journal'`, `journal_date` (YYYY-MM-DD), `summary_config -- [E]`. `[FACT: ADR-002
  L1274-1310; note.ts Page L87-108]`
- **NP-2 — one journal per date** (partial unique index `idx_pages_journal_unique`). `[FACT: ADR-002 L1310]`
- The **`/summary` block** + `buildJournalSummary(date, config)` + `JournalSummaryConfig` (5 shipped toggles:
  `showHabits/showTasks/showStudySessions/showTransactions/showInteractions`). `[FACT: note.ts L75-81;
  notes-and-pages/contract.md L20]`
- **G7 — the summary is a LIVE block** that re-aggregates on open, not a frozen daily copy. `[FACT:
  notes-and-pages/identity.md L19]`
- **G5 — the full section menu is INTENDED**: Routines, class schedule, Reminders, Events, Check-in,
  Goals/Targets, Pomodoro, Gamification — beyond the shipped 5. `[FACT: notes-and-pages/business-rules.md G5]`

**What THIS context owns (vs Notes & Pages):** the **aggregation ENGINE + dashboard behavior** —
- `journal-service.ts` (**0 lines** — INTENDED): the logic that turns each module's dated data into summary
  sections + the agenda. `[FACT: wc -l = 0]`
- the **auto-generated daily summary** (backward: what happened) + **today's agenda** (forward: what's due),
  and the **journal VIEWS** (Calendar · List · Gallery grouped by week/month/year). `[FACT: CLAUDE.md §8 Journal]`

**This session's foundations feed directly in:** Sessions & Scheduling emits `surface_journal` effects
(ADR-004) + shares the **`dueIn()` provider primitive** with "Journals agenda"; Knowledge mastery, Session
logs, Check-ins all become summary sources. `[FACT: sessions-and-scheduling/contract.md]`

## Existing docs incorporated (D5b)
Notes & Pages docs OWN the journal page + `/summary` block interface + NP-2 + G5/G7 — **authoritative, do NOT
duplicate or contradict**. This context documents the ENGINE behind the block + the dashboard, referencing
Notes & Pages for the page/block. No separate journal `.md` exists.

## Legacy (life-os v1 — context only, never a decision)
v1 had a **"Today" page** (`features/today/` — TodayPage.tsx, StudySession.tsx, FocusMode.tsx; `todayRoutes`)
= the daily dashboard equivalent: aggregated today's tasks/habits/study into one surface. `[FACT: ../life-os/
src/features/today/]` Flawed/partial; context only.

## GAP MAP (what the code cannot answer — for Victor, one batch)
- [x] **J1 — RESOLVED (Victor 07-12): distinct context = the aggregation ENGINE (A).** Notes & Pages owns the
      journal PAGE + `/summary` block + NP-2 + free-form entry; **Journals owns `journal-service`** (sources →
      sections), the agenda, and the journal views. ⭐ Forced by the dep graph: Notes & Pages is a Wave-0
      foundation (in-degree 14); if it aggregated all modules it would depend on the things that depend on it
      (a cycle). The engine MUST sit above the modules → its own context.
- [x] **J2 — RESOLVED (Victor 07-12): provider REGISTRY (A) + per-module GRANULAR user selection.** Each module
      **registers a "journal contribution"** advertising the data points it *can* show; the **user selects
      which ones, per module** (UX/UI control) — not a fixed 5 toggles, not all-or-nothing per section.
      `JournalSummaryConfig` → a granular per-module selection model over what's registered. `journal-service`
      names no module (seam, not instance — the session's recurring pattern). Storage: **global default in
      Preferences + per-journal override in `summary_config`** [my read, non-blocking].
- [x] **J3 — CONFIRMED (Victor 07-12): two halves.** Journal = **summary (backward: what happened)** +
      **agenda (forward: what's due, via the shared `dueIn()` primitive)**. The engine has two provider-facing
      sides: `summary(date)` + `dueIn(range)`.
- [x] **J4 — RESOLVED (Victor 07-12): SNAPSHOT-based Review & Analytics subsystem (overrode live-only).** The
      journal's purpose is to see the past AS IT WAS and measure improvement. Model:
      - **Snapshot is the base** — a past day shows the **point-in-time snapshot of that day**; layers onto
        Notes & Pages G7: **today = live block · past = snapshot · + optional live comparative overlay**
        (then-vs-now), presentation left to the user (fully personalizable).
      - **User-defined time-frames** — day/week/month/year **+ custom** (bi-week, bimester, semester, arbitrary).
      - **Scheduled reviews, Spotify-Wrapped style** — periodic recaps with a dedicated review UI/UX the user
        **plans when to receive** (specific day-of-week/month/year, recurring).
      - **Improvement lens** — aggregates snapshots over a period to show **progress vs goals/dreams/purposes**,
        **project development**, and **workload/actual output** in the period lived (trajectory, not a list).
      ⚠ Two subsystems now: the **daily dashboard** (live today) + a **temporal Review engine** (snapshots →
      periods → scheduled recaps). Review-engine INTERNALS = **design-pass** (period math, Wrapped composition,
      delivery scheduling); intent captured here.
- [x] **J5 — DEFERRED (Victor 07-12): views decided after** — Calendar · List · Gallery (week/month/year) at
      intent level; detail = the standing build-time per-module VIEWS pass.
- [x] **J6 — CONFIRMED (Victor 07-12): layering.** The journal PAGE (Notes-owned TipTap surface + `[[links]]`)
      holds the user's free-form writing **with Journals' live blocks (summary, agenda) embedded** alongside.
- [x] **J7 — CONFIRMED (Victor 07-12): shared provider, different scope.** Journal agenda = one day (embedded);
      Global Calendar = a range/timeline (its own surface). Both read the shared `dueIn()` primitive.
- [~] **J8 — FLAGGED, deferred (Victor 07-12): Check-ins integration = decided when the Check-ins module logic
      is revisited.** Victor needs to see how Check-ins is established to choose. Forward cross-module dep; NOT
      a gap choice now. (Check-ins is documented Wave-1, but its journal-section integration is deferred.)

## Status
- [x] intake "whole" (2026-07-12) — J1–J7 resolved; J8 flagged (Check-ins integration deferred to that
      module's revisit). Completeness sweep done — surfaced only forward-deps / design-pass / flags, no new
      blocking decision.
- [x] context was NOT `ambiguous` in Phase 0 (structural manifest row, not prose) — no role to resolve

## Deferred / surfaced (for Phase 4 + build) — completeness sweep 2026-07-12
- **G7 reconciliation (cross-module → Notes & Pages):** N&P G7 said "live-only"; Journals refines it to
  **live-today + snapshot-past + optional live comparative**. Note back to Notes & Pages docs.
- **Snapshot storage → ADR-002 amendment:** per-day (+ per-period) aggregated snapshot; each an encrypted
  blob (ZK/LWW). New table(s). Consolidate with the standing amendment.
- **Review engine design-pass:** snapshot timing (rollover/on-demand) + backfill-vs-frozen rule + period
  math + Wrapped-style composition + scheduled delivery. Own mini-intake before speccing internals.
- **Forward dependencies (stub now, wire when documented):** Purpose & Goals (Wave 3 — goals/dreams/purposes
  progress) · Gamification (Wave 4 — streaks/XP in reviews) · Notifications (Wave 4) + Sessions (scheduled
  review delivery). The improvement lens reads these; document against them at their fill.
- **Per-module selection storage:** global default in Preferences + per-journal override in `summary_config`
  [my read — confirm at build].
- **Boundary:** `analytics.ts` computes; Journals Reviews present (scheduled + personalized). Keep separate.
- **J8 Check-ins:** journal-section integration decided at the Check-ins module revisit.
