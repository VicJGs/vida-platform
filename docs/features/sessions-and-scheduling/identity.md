<!-- Identity — features/sessions-and-scheduling · /documentation Phase 2 · sources: ADR-002 study_sessions L2524-2551 + §5.11 planner L2743-2882 + pomodoro_sessions L1432-1440 · types learning.ts L194-211, knowledge.ts L222-250 · v1 studyPlanner.ts (409L) + entities.ts L1551,L1677-1711 · docs/intake/sessions-and-scheduling.md -->

# Identity — Sessions & Scheduling  (level: Foundation / OWN MODULE — extracted + PROMOTED from Learning "Study Sessions & Planner")

**What it is.** The OS's **session foundation and scheduling engine** — the two-pillar module every timed,
focused activity in Vida is built on. **Pillar 1, the Sessions framework:** a single polymorphic **Session**
supertype with many **sub-types** (study · class · focus · reading · practice · review · workout · work · …),
each a first-class entity with its own tooling, that share one spine and one **Integration Contract** for how
they reach into the rest of the OS. **Pillar 2, the Scheduling engine:** availability windows + **planned
blocks** that place work into time, aggregating every module's due-work through a shared provider primitive.
`[INTENT: reframe 2026-07-10/11/12; FACT: v2 base = study_sessions L2524-2551 + §5.11 planner L2743-2882, all schema-only, 0 logic]`

**The desire behind it.** The OS already had **9+ session-shaped entities scattered across modules** (study,
practice, daily, pomodoro in v2; workout in Wave-R Health; reading in Books) with **no shared spine** — and a
per-course study planner that owned its own reschedule loop and couldn't see the rest of life. The intent is
to make **"a session"** a real OS primitive: one place the user *does focused work* of any kind, one place it
*plugs into everything it affects*, and one engine that *plans the user's time* across the whole platform —
not a Learning-only tool. `[INTENT: Victor 2026-07-11/12]`

**The two reframes that created this module.** `[INTENT: Victor 2026-07-10→12]`
- **Extraction + promotion (G1).** No longer a Learning sub-context. It is a **foundational (Level-1)
  cross-cutting module**, sibling to Routines as an orchestration layer. Learning drops to Education +
  Flashcards. Documented modules (Books/Education/Knowledge/Language, Health when built) each gain a
  `*_session` sub-type that conforms to the shared contract.
- **Aggregator, not duplicator (G2).** The engine **owns its own generated sessions** (Education
  topics/homework/exam-prep) but **never owns another module's schedule** (Books `reading_plans`, Flashcards
  SM-2, Knowledge review curves). It reads them **live** via `dueIn()` and allocates time — zero mirroring,
  zero staleness. This honors Books **BK-12** ("the Study Planner consumes, never writes").

**The shipped-defaults principle.** `[INTENT: Victor 2026-07-12]` Every **identified** sub-type ships
**fully configured by us** — its attachment, effects, lifecycle, and permissions are pre-defined. The user
does **not** set up the main ones (not viable). A user **may** edit a shipped type, but it is
**possible-but-not-recommended**. User-extensibility exists for the **long-tail new types the user invents**,
never for wiring the defaults. (The OS is useful out of the box — anti-lost.)

**The `scheduling_mode` axis.** `[INTENT: 2026-07-11]` Every session is **attended** (a real-world fixed event
that *consumes* availability, e.g. a class), **planned** (the engine *places* it in a free window), or
**ad-hoc** (started spontaneously). The engine treats them differently — attended sessions are constraints,
planned ones fill the gaps.

**What it is NOT.** `[INTENT — anti-scope-creep, constitution §1]`
- **Not Learning-only.** It spans Habits, Tasks, Projects, Health, Purpose, Language — any module with timed
  focused work.
- **Not the Global Calendar.** The Calendar *renders* placed blocks (read-only); this module *writes* them.
  It decides *when*; the Calendar shows *what/where*. `[[../../intake/sessions-and-scheduling]]`
- **Not the owner of any module's schedule.** Books/Flashcards/Knowledge own their own plans; this aggregates
  them (G2/BK-12).
- **Not the owner of domain mastery.** It **emits** completion signals; Knowledge (KN-10) and Education own
  and compute mastery/pace. It owns **session** analytics only, never **domain** measurement (G10).
- **Not the Pomodoro runtime.** The timer is a **Notes** entity (`pomodoro_sessions`); this module owns the
  **templates** and attaches a timer on start. `[FACT: ADR-002 pomodoro_sessions L1432; entity_type includes 'study_session' L1435]`
- **Not the placement algorithm's home yet.** The scheduler's internals (urgency scoring, recalc-on-miss) are
  a deferred **design-pass** (G5), not specced here.

**Terminal states (module-level).** Empty (no availability/sessions yet → a starter availability grid + the
shipped session types shown, anti-lost) · Loading (agenda/analytics hydrating) · Error (typed; a failed
effect never silently corrupts a linked entity — fail loud) · Populated (sessions logging, blocks placed,
providers feeding the agenda, effects firing across the OS). `[INTENT]`

**Neighbors.** `[[../../intake/sessions-and-scheduling]]` (whole intake) · `[[../books/identity]]`
(reading_session sub-type; Books owns reading_plans, consumed) · `[[../learning/education/identity]]`
(class_session; generation source + pace-signal consumer) · `[[../knowledge/identity]]` (review_session;
mastery-signal consumer, KN-10) · Flashcards (review_session; SM-2 provider) · Notes & Pages (Pomodoro
runtime + Journal feed) · Routines (presets availability windows) · Habits / Tasks / Projects / Purpose /
Gamification / Health (Integration-Contract effect targets) · the parked **Global Calendar** (renders blocks).
