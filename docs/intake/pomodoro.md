<!-- Intake — Pomodoro (Wave 4, exec #5) · documentation-blueprint Step 1
     Sources harvested:
       CURRENT (v2): ADR-002 pomodoro_sessions L1433-1458 + user_preferences pomodoro_* L3497-3500;
                     packages/types/src/note.ts L58-64,154-163; @vida/core pomodoro-service.ts (0 lines),
                     @vida/editor pomodoro-block.ts (0 lines), @vida/ui pomodoro-widget.tsx (0 lines);
                     Notes&Pages contract.md L19 (API), identity.md L11 (/pomodoro block), structure-data.md L14,23;
                     Tasks business-rules TK-5 + conventions L9 + structure-data L29-30; Sessions identity L50-51;
                     ADR-004 §3.2 (attach_pomodoro effect), §2 (pomodoro_sessions in the 9 scattered entities).
       LEGACY (v1): life-os/src/types/studyPlanner.ts L80-175 (PomodoroSession, SessionTemplate, PomodoroSettings);
                    life-os/src/features/today/components/FocusMode.tsx; .../study-planner/pomodoro/* components.
       INTENT: CLAUDE.md §8 "Pomodoro Timer — Embedded in notes, linked to tasks/classes/study sessions".
     STATUS: G0 RESOLVED 2026-07-15 (Victor) → option (B): a thin CAPABILITY-DOC. Pomodoro is documented as an
             OS ENTITY (the timer runtime + its state machine/rules), NOT a module. Keeps a small pomodoro/
             context with the canonical 5 aspect docs; the entity `pomodoro_sessions` stays a Notes&Pages
             satellite by ownership, but its runtime rules are written down here as a nameable capability
             (Flashcards→Knowledge-service precedent).
             ✅ INTAKE WHOLE 2026-07-15 — G0–G7 all resolved. Core REFRAME: Pomodoro consolidates entirely into the
             Sessions realm as the `focus` sub-type runtime (no leak to other entities); big INTENDED surface =
             the polymorphic, platform-adaptive, tool-bearing Focus Mode (design-pass, build-phase). Ready for Step 2.
             DOC DECISIONS (Victor 07-15): keep docs/features/pomodoro/ as its OWN context (canonical 5 aspect docs,
             cross-ref Sessions); replace the 5 legacy-named empty stubs. ADR = NOTE now / amend at BUILD (document
             target state; flag ADR-004 amendment [pomodoro=focus runtime] + ADR-002 re-home [pomodoro_sessions →
             Sessions, re-point session_id] for the consolidated build-phase pass). -->

# Pomodoro — Intake & Gap Map

## 0. One-line

The **focus-timer runtime of the `focus` Session sub-type** (25/5 Pomodoro technique). Pomodoro lives
**solely in the Sessions & Scheduling realm** — it is not a module, not a Notes satellite; every use goes
_through a Session_, and all its cross-module reach (time-to-task, XP, journal, calendar) rides the ADR-004
Integration Contract the Session already declares.

> ⚠ REFRAME (Victor, 2026-07-15) — RESOLVES G0+G1+G2+G4. Pomodoro consolidates **entirely into the Sessions
> realm**, finishing ADR-004's absorption of the 9 scattered session entities (it pre-declared `attach_pomodoro`
>
> - named `pomodoro_sessions`). This **moves a boundary**: `pomodoro_sessions` was documented as a **Notes & Pages**
>   owned table (ADR-002 §5.2); it now becomes the **Sessions** focus-runtime, re-pointed at `session_id`, dropping
>   the polymorphic `entity_type` CHECK. Touches (must reconcile at Transform):
>   • **Sessions & Scheduling** aspect docs + ADR-004 — the `focus` sub-type gains the timer-runtime rules; pomodoro is its runtime.
>   • **Notes & Pages** aspect docs — the `/pomodoro` block/widget becomes a **focus-Session launcher/view**, not an owner of a separate entity; retire `pomodoro_sessions` from N&P owned tables + its `PomodoroSession` API (or thin it to a session-launch call).
>   • **ADR-002** — `pomodoro_sessions` re-homed to Sessions + re-pointed at `session_id`; retire polymorphic `entity_type`/`entity_id`.
>   • **Tasks** — task↔pomodoro integration is _via a focus Session_ ("a task uses a session to finish/present its deliverable"), through the session's `log_time(task)` effect (TK-5 still holds — the ledger is unchanged).
>   Likely an **ADR-004 amendment** (not a new ADR): pomodoro = the `focus` sub-type runtime + its lifecycle rules.

---

## 1. What v2 ships today `[FACT]`

**Owned artifacts — but 0 logic (greenfield).** Three code files exist and are all **empty** (`wc -l = 0`):
`packages/core/src/services/pomodoro-service.ts`, `packages/editor/src/extensions/pomodoro-block.ts`,
`packages/ui/src/components/pomodoro-widget.tsx`. Only the schema + types are real.

**Schema — `pomodoro_sessions`** (ADR-002 §5.2, **owned by Notes & Pages**, all-plaintext / zero `[E]` fields):

| Column                                       | Notes                                                   |
| -------------------------------------------- | ------------------------------------------------------- |
| `id`, sync cols                              | UUIDv7 + standard `_sync_*`                             |
| `page_id` → pages (SET NULL)                 | the note the timer runs on, if any                      |
| `entity_type` CHECK                          | `task · task_group · class_note · note · study_session` |
| `entity_id`                                  | polymorphic target                                      |
| `started_at`, `ended_at`, `duration_seconds` | interval bounds                                         |
| `type` CHECK                                 | `focus · short_break · long_break`                      |
| `status` CHECK                               | `running · paused · completed · cancelled`              |
| `completed_count`                            | pomodoros done in the run                               |

**Config — `user_preferences`** (owned by Preferences): `pomodoro_work_minutes` (25), `pomodoro_break_minutes`
(5), `pomodoro_long_break_minutes` (15), `pomodoro_sessions_before_long` (4).

**Contract (Notes & Pages):** `startSession(page_id?|entity)` · `endSession(id)` · `getSessionsForPage(page_id)`.
`/pomodoro` is 1 of the 12 platform editor blocks. Zustand owns the ephemeral timer tick.

## 2. Where the ecosystem ALREADY re-homed Pomodoro's pieces `[FACT]`

The modules documented **before** Pomodoro each claimed a slice — this is the crux of the altitude question:

| Piece                                                      | Owner (documented)                           | Evidence                                        |
| ---------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| The timer state machine + `/pomodoro` block + widget + API | **Notes & Pages**                            | table in §5.2; contract.md L19; identity.md L11 |
| The "what to focus on" template + effects on start         | **Sessions & Scheduling** (`focus` sub-type) | identity L50-51; ADR-004 §3.2 `attach_pomodoro` |
| Interval config (work/break/long/cadence)                  | **Preferences**                              | ADR-002 L3497-3500                              |
| Time contribution (`actual_minutes`)                       | **Tasks** (`task_time_logs`, TK-5)           | tasks/business-rules TK-5                       |
| "Focus" screen layout                                      | **Tasks** (12 base layouts incl. **Focus**)  | tasks/structure-data L29                        |
| Focus-time-today on the daily dashboard                    | **Journals** (`/summary`)                    | notes contract L25                              |

## 3. What v1 had that v2 dropped (the "desire") `[FACT: life-os]`

v1's `studyPlanner.ts` + `FocusMode.tsx` were **far richer** than v2's 9-column table:

- **Session templates** — named, reusable: `work/short_break/long_break` durations, `intervals_before_long_break`,
  `default_focus_technique`, `auto_start_breaks`, `auto_start_next_interval`, `show_notifications`, `play_sounds`,
  `usage_count`, `is_default`, icon/color.
- **Pause tracking** — `paused_at`, `total_pause_seconds` (v2 has a `paused` status but no accumulated-pause field).
- **Interruption capture** — `was_interrupted`, `interruption_reason`.
- **planned vs actual** — `planned_minutes` + `actual_minutes` + `session_number` per interval.
- **Focus Mode** — a full-screen mode: current task, `pomodoroCount of pomodoroTarget`, `totalFocusToday`,
  pause/resume, **skip task**.
- Links: v1 pomodoro pointed at a `scheduled_session_id` + `template_id` (the planner), not a polymorphic entity.

Much of this richness **already has a home** in the newer modules (templates ≈ Sessions `focus` sub-type ships
configured; `focus_rating`/`distraction_count`/`key_learnings`/lifecycle live on the ADR-004 `sessions` spine;
config ≈ Preferences). The open question is what remains **Pomodoro-runtime-specific** (pause accumulation,
interruption, auto-start, sounds/notifications) and where it lives.

---

## 4. GAP MAP — needs Victor's intent (No-Guessing: unresolved = UNKNOWN)

### ⭐ G0 — ALTITUDE: is Pomodoro a module, a thin capability-doc, or dissolved?

The strong FACT pattern (§2) is that every piece is already owned elsewhere → this looks like the **Commitments /
Investigations / Languages / Duties composition pattern** (mature core → new "feature" = a composition, not a
new schema). But unlike those, Pomodoro **owns 3 real code artifacts** (table + block + widget) and is a genuine
cross-cutting **runtime**. Three honest options:

- **(A) DISSOLVE** — thread residual intent into Notes & Pages (runtime + block + widget + API), Sessions (`focus`
  sub-type = the attach point), Preferences (config), Tasks (ledger + Focus layout), Journals (summary). No
  separate aspect docs; delete the empty `docs/features/pomodoro/` stubs; mark the manifest row dissolved.
  _Precedent: Languages, Duties, Finance→Commitments, Projects→Investigations._
- **(B) THIN CAPABILITY-DOC** — keep a small `pomodoro/` context with the canonical 5 aspect docs that pull the
  threads together (the timer state machine + its runtime rules + its relationship to the 3 owners), the way
  **Flashcards** got its own docs as a _service sub-context_ of Knowledge.
  _Precedent: Flashcards → Knowledge study-method service (ADR-005)._
- **(C) MODULE** — treat it as a standalone Wave-4 peripheral with its own owned surface. _Weakest option given §2._

**Recommendation: (B) or (A).** Lean (B) if you want Pomodoro's runtime rules (pause/interruption/auto-start
state machine) written down as a nameable capability; lean (A) if the runtime is thin enough to fold into Notes.
_This is your altitude call — I will not pre-decide it._

### G1 — v1 richness restoration ✅ RESOLVED (Victor 07-15): all IN, reshaped into the foundation

Lost in the rebuild; Victor wants them back but **reshaped for seamless integration within the OS** (Pomodoro is
a _feature_, not a module/sub-context — "lay a foundation for it to work properly within everything"). Home for each:

- (a) pause accumulation · (b) interruption capture → **runtime fields/rules on the `focus` session** (not v1's flat cols).
- (c) auto-start-breaks · (d) auto-start-next · (e) notifications · (f) sounds → **Preferences** config the runtime obeys.
- (g) named **focus templates** → **`focus` Session presets** (ADR-004 "shipped types ship fully configured" +
  user-extensible long-tail) — templates live in **Sessions**, not a separate Pomodoro store.

### G2 — Attach model ✅ RESOLVED (Victor 07-15): Model (ii), Sessions-realm-only

Victor: the OS is complex enough to handle it "only within the Sessions realm, and not leak to any other entity."
Every pomodoro **is** the runtime of a `focus` Session; the `/pomodoro` block launches/reflects one. `pomodoro_sessions`
points at **`session_id`** (ADR-004 spine), not a polymorphic entity. Task integration is _via_ a Session ("a task
could use a session to finish and present its deliverable") → the session's `log_time(task)` effect (TK-5 unchanged).

### G3 — Focus Mode ✅ RESOLVED (Victor 07-15): polymorphic, platform-adaptive, tool-bearing runtime ⚠ INTENDED

IN the vision, **owned by Sessions** (personalization _within each session_; the Tasks "Focus" layout is one entry
point, not the owner). Focus Mode is **not one screen** — it is the rendered runtime that:

- **Changes shape per session TYPE** (workout · work · reading · eating · study · …), surfacing exactly the **OS
  tools that serve THAT session's deliverable** — the rendered face of the session type's ADR-004 declared tool-set.
  _Ex (workout): guide exercises · take breaks · view body stats/metrics · cue hydration / energy-recompose / rest
  · end-of-session analytics._ Composes the owning module (workout→Health, reading→Books, eating→Nutrition).
- **Has distinct UI states for mobile / desktop / web** — each optimized for the tools the user needs there, all
  under a **low-distraction** principle.
- **Widget refinement (G2):** the Note/Page `/pomodoro` block **showcases the pomodoro-enabled sessions** (granular
  lens); embedding it uses a specific session and **links that page's analytics to that session**. View, never owner.
  → Large INTENDED surface (code = 0 lines). Needs a **Focus Mode design-pass** (per-type tool-sets × per-platform
  states × break-guidance), build-phase. Non-blocking for documentation; captured as INTENDED.

### G4 — entity/attach scope ✅ DISSOLVED by G2

The timer attaches to a `session_id`; a Session can be _about_ anything (task, habit, workout, note…), so the old
5-value `entity_type` CHECK is retired. No polymorphic scope list to decide.

### G5 — analytics ✅ RESOLVED by G2 (rides the spine)

Focus stats are a **cut of session analytics** off the base `sessions` table (ADR-004 §5 "one query powers all
session analytics"), not a separate Pomodoro engine. It **feeds** Journal `/summary` + Tasks `actual_minutes`;
whether a dedicated "Focus" analytics view exists is a **build-phase views question** (⚠ INTENDED, non-blocking).

### G7 — Gamification hook ✅ RESOLVED by G2 (rides `award_xp` effect)

Completed focus session → the `focus` sub-type's declared `award_xp` effect fires (ADR-004 §3.2). Hook exists;
Gamification (Wave 4) sets the actual XP/streak values. Stub the contract.

### G5 — Analytics ownership

Does Pomodoro have its **own** analytics surface (focus-time trends, completed-pomodoro counts, focus streaks), or
does it only **feed** others (Journal summary, Tasks `actual_minutes`, Gamification)? v1 surfaced "total focus today."

### G6 — Break behavior ✅ RESOLVED (Victor 07-15, via the G3 workout example)

Breaks are **not dumb countdowns** — they carry **per-session-type semantic guidance** surfaced inside Focus Mode
(hydration, energy-recompose, rest cues, suggested activities). Shape varies by type (workout ≠ reading ≠ work).
Enforced-vs-skippable per type = a build-phase Focus-Mode design detail (⚠ INTENDED, non-blocking).

### G7 — Gamification hook (forward dep, Wave 4)

Do completed pomodoros award XP / feed a focus streak? (Stub the contract now; Gamification wires it later.)

---

## 5. Non-gaps (already answered by code/docs — do NOT re-ask)

- Interval config values + long-break cadence → **Preferences** (`pomodoro_*`). `[FACT]`
- How a task's time is recorded → **Tasks** `task_time_logs`, auto-summed, per-task opt-out (TK-5). `[FACT]`
- Encryption class → all-plaintext (structural/numeric timer state, zero `[E]`). `[FACT: ADR-002 L1151]`
- The editor block → `/pomodoro`, one of the 12 platform blocks, owned by @vida/editor. `[FACT]`
- Sync → LWW like every syncable table; `pomodoro_sessions` carries `_sync_*`. `[FACT: ADR-003]`
  </content>
  </invoke>
