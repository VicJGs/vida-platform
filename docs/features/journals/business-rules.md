<!-- Business Rules — features/journals · /documentation Phase 2 · sources: ADR-002 pages/journal L1266-1310 · note.ts JournalSummaryConfig L75-104 · notes-and-pages/business-rules.md (NP-2, G5, G7) · sessions-and-scheduling (dueIn, ADR-004) -->

# Business Rules — Journals (level: Feature / integration layer)

> Inherits the CORE constitution (ZK-1, LF-2) and Notes & Pages' journal-page rules (NP-2 one-per-date; the
> `/summary` block; G5 section set; G7 live block). Journals owns the ENGINE behind the block; it never
> re-declares the page rules.

## Invariants (what is ALWAYS / NEVER true)

**Aggregation & boundary**

- **JR-1 — Journals is the engine, Notes & Pages is the page.** Journals owns `journal-service` (sources →
  sections), the agenda, snapshots, reviews, and journal views; it NEVER owns the `pages` row, NP-2, the
  `/summary` block interface, or the free-form entry (those are Notes & Pages). `[FACT: notes-and-pages/*; J1]`
- **JR-2 — The engine sits ABOVE the modules (no cycle).** Journals depends downward on the modules + Notes &
  Pages; Notes & Pages (a Wave-0 foundation) NEVER depends on Journals. `[INTENT: J1; FACT: dep graph]`
- **JR-3 — Modules contribute via a registry; the journal names no module.** Each module **registers a journal
  contribution** — `summary(date)` (recap) and reuses `dueIn(range)` (agenda). `journal-service` iterates the
  registry; adding a module never edits the journal. `[INTENT: J2; FACT: sessions dueIn primitive]`
- **JR-4 — The user selects, per module and granularly, what shows.** A contribution advertises its available
  data points; the user picks which appear, per module (UX control). `JournalSummaryConfig` is that selection,
  not a fixed 5 toggles. Global default in Preferences; per-journal override in `summary_config`. `[INTENT: J2]`
- **JR-5 — Two halves.** The dashboard = **summary (backward)** + **agenda (forward)**. Agenda reads the
  shared `dueIn()` primitive (also feeding Sessions + the Global Calendar). `[FACT: J3]`

**Snapshots & reviews**

- **JR-6 — Past = snapshot; today = live (refines G7).** Today's journal is a LIVE block (re-aggregates on
  open, G7). A PAST day shows the **point-in-time snapshot of that day**. An **optional live comparative**
  overlays then-vs-now; presentation is the user's. `[INTENT: J4; refines notes-and-pages G7 — cross-module note]`
- **JR-7 — A summary provider must answer "for date X" deterministically.** Contributions are date-keyed so a
  snapshot is a faithful record of that day (the improvement lens depends on it). `[INTENT: J4]`
- **JR-8 — Reviews compose snapshots over user-defined time-frames.** day/week/month/year + custom (bi-week,
  bimester, semester, arbitrary). A review is scheduled (the user plans when to receive it) and rendered in a
  dedicated Wrapped-style UI. `[INTENT: J4]`
- **JR-9 — The review lens is improvement.** A review shows progress vs goals/dreams/purposes (Purpose &
  Goals — ⚠ forward-dep, Wave 3), project development (Projects), and workload/output in the period. It is a
  trajectory, not a list. `[INTENT: J4; ⚠ forward-dep]`
- **JR-10 — Analytics computes, Journals presents.** Journals never re-implements metric math owned by
  `analytics.ts`; it schedules + personalizes the presentation. `[INTENT: sweep]`

## Validation & edge cases

- A registered provider throws on `summary(date)` → that **section** degrades to an explicit empty/error
  state; the rest of the journal renders (never a blank journal). `[FACT: notes-and-pages summary degrade rule]`
- A **backfill** of past data (e.g. Habits' backfill window) after a snapshot exists → whether the snapshot
  updates or stays frozen is a **design-pass** rule (JR-6 tension); flagged, not decided here. `[INTENT: sweep]`
- A review requested for a period with **insufficient history** → explicit "not enough data yet" state, never
  a misleading empty recap. `[INTENT]`
- A module with **no** registered contribution → simply absent from the journal (not an error). `[INTENT: J3]`

## Terminal states (before any build — constitution §2)

- **Daily dashboard:** loading (providers resolving) · empty/first-day (each section shows its own "nothing
  yet", anti-lost) · error (per-section degrade) · populated.
- **A snapshot:** pending (day not yet snapshotted) · captured (frozen record) · (design-pass: re-captured on
  backfill?).
- **A review:** scheduled → generating → delivered (Wrapped UI) · insufficient-data (explicit) · error
  (a source failed → partial recap flagged, never a silent gap).
- **Agenda:** loading · empty ("nothing due", anti-lost) · error (a `dueIn` lane degrades) · populated.

## Failure behaviour (fail loud — constitution §5)

- A failed provider degrades its **section**, never the whole journal (JR-1 boundary + fail-loud).
- Journals NEVER writes a module's data to "fix" a gap — it reads via the registry only (JR-3).
- A review with a failed source is delivered **flagged as partial**, never silently short.

## Completion checklist

- [x] invariants with [FACT]/[INTENT] · [x] all terminal states enumerated · [x] failure is loud ·
      [x] inherits N&P journal-page rules + refines G7 · [x] forward-deps flagged (Purpose/Gamification/Notifications)
