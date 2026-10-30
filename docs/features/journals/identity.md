<!-- Identity — features/journals · /documentation Phase 2 · sources: ADR-002 pages/journal L1266-1310 · note.ts JournalSummaryConfig L75-104 · journal-service.ts (0 lines) · notes-and-pages/* (journal page owner) · sessions-and-scheduling/contract.md (dueIn) · v1 features/today/ -->

# Identity — Journals (level: Feature / the INTEGRATION LAYER — last Wave-2 context)

**What it is.** The **aggregation engine and temporal dashboard** of the platform — the thing that turns
every module's dated data into the user's daily surface and his sense of progress over time. It is **two
subsystems**: `[INTENT: reframe Victor 2026-07-12]`

- the **daily dashboard** — today's live **summary** (what happened) + **agenda** (what's due), assembled
  from every module through a provider registry; and
- the **temporal Review engine** — **snapshots** of each day, composed over user-defined periods into
  scheduled, Spotify-Wrapped-style recaps that show how far he's come.

A journal is not its own table — it is `type='journal'` in the `pages` table, whose **page** mechanics
(one-per-date NP-2, the `/summary` block, the free-form entry) are owned by **Notes & Pages**. Journals owns
the **engine behind the block** (`journal-service.ts`, today **0 lines** — INTENDED). `[FACT: ADR-002
L1266-1310; notes-and-pages/*; wc -l journal-service.ts = 0]`

**The desire behind it.** Every module produces dated life-data; without one surface that aggregates it and
one lens that shows _movement over time_, the platform is 17 silos. The journal exists so the user has (a) a
single daily dashboard, and (b) a way to **look back and measure improvement** — how close he is to his
goals, dreams, and purposes, how his projects are developing, and how much he actually did in the period he
lived. `[INTENT: Victor 2026-07-12]`

**Why it is a distinct context (not part of Notes & Pages).** Notes & Pages is a Wave-0 **foundation**
(in-degree 14 — everything depends on it). If it also aggregated all 17 modules it would depend on the very
things that depend on it — a **dependency cycle**. The aggregation engine must sit **above** the modules, so
it is its own context, depending downward on the modules + on Notes & Pages. `[INTENT: J1; FACT: dep graph]`

**How it aggregates — the provider registry (the session's recurring seam).** Journals names **no module**.
Each module **registers a journal contribution**: a `summary(date)` for the recap (and reuses its `dueIn(range)`
for the agenda — the same primitive built for Sessions & the Global Calendar). The journal renders whatever is
registered; a new module appears automatically. The user then **selects, per module and granularly, which
data points show** — personalization for UX/UI. `[INTENT: J2; FACT: sessions-and-scheduling/contract.md dueIn]`

**Snapshots + reviews (the improvement lens).** A past day shows the **snapshot of that day** (what was true
then), optionally overlaid with a **live comparative** (then-vs-now). Snapshots compose over **user-defined
time-frames** (day/week/month/year + custom: bi-week, bimester, semester, …) into **scheduled reviews** the
user **plans when to receive** — a dedicated recap UI showing trajectory vs goals/dreams/purposes, project
development, and workload. `[INTENT: J4]`

**What it is NOT.** `[INTENT — anti-scope-creep, constitution §1]`

- **Not the journal page or editor.** The `pages` row, NP-2, the `/summary` block, and the free-form TipTap
  entry + `[[links]]` are **Notes & Pages**. Journals fills the block; it does not own the page. `[[../notes-and-pages/identity]]`
- **Not `analytics.ts`.** Analytics _computes_ metrics; Journals _presents_ them — scheduled + personalized.
- **Not the Global Calendar.** Both read `dueIn()`; the journal agenda is **one day** embedded in the
  dashboard, the Calendar is a **range timeline** (its own surface). `[INTENT: J7]`
- **Not a god-context.** It couples to the **registry contract**, never to modules by name (J2).
- **Not the review-engine internals.** The period math, Wrapped-style composition, and delivery scheduling
  are a **design-pass**; only the intent is specced here.

**Terminal states (module-level).** Empty / first day (no history → the dashboard renders with each section's
own "nothing yet", anti-lost; a review needs history → "not enough data yet, come back") · Loading
(providers/snapshots resolving) · Error (a provider fails → **that section degrades**, the rest render — never
a blank journal) · Populated (sections aggregated, snapshots accruing, scheduled reviews delivering). `[INTENT: J4; FACT: notes-and-pages/business-rules.md summary degrade rule]`

**Neighbors.** `[[../notes-and-pages/identity]]` (owns the journal page + `/summary` block + editor) ·
`[[../sessions-and-scheduling/identity]]` (`dueIn` agenda provider + `surface_journal` effect) · every module
(a registered `summary(date)` provider) · Purpose & Goals /
Gamification / Notifications (⚠ forward-deps for the improvement lens + scheduled delivery — Wave 3/4).
