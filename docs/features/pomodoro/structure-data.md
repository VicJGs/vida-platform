<!-- Structure & Data — features/pomodoro · /documentation Phase 2 · sources: ADR-002 pomodoro_sessions L1433-1458 + L1151 (zero-E) + user_preferences pomodoro_* L3497-3500 + entity/dep graph L3756,L3816 · note.ts L58-64,154-163 · ADR-004 §3.1/§3.4 · Sessions structure-data (sessions spine, focus_sessions extension) · Tasks task_time_logs L1510 · v1 studyPlanner.ts pause/interruption fields · docs/intake/pomodoro.md -->

# Structure & Data — Pomodoro  (level: Feature / CAPABILITY within the Sessions & Scheduling realm)

> ⚠ **INTENDED shape.** The v2 FACT is one table (`pomodoro_sessions`, Notes-owned) + 4 Preferences columns,
> with **0 lines of logic**. The reframe below re-homes the entity into the Sessions realm and re-points it at
> `session_id` — an **ADR-004 amendment + ADR-002 re-home**, flagged for the consolidated build-phase pass.
> `[FACT: pomodoro-service.ts/pomodoro-block.ts/pomodoro-widget.tsx all wc -l = 0]`

## Data model

### FACT base today (Notes-owned, pre-reframe)
- **`pomodoro_sessions`** — the timer runtime. All-plaintext (**zero `[E]` fields** — structural/numeric
  only). Columns: `id · page_id → pages (SET NULL) · entity_type CHECK{task,task_group,class_note,note,
  study_session} · entity_id · started_at · ended_at · duration_seconds · type CHECK{focus,short_break,
  long_break} · status CHECK{running,paused,completed,cancelled} · completed_count · created/updated · _sync_*`.
  Indexes: `idx_pomodoro_page`, `idx_pomodoro_entity`. `[FACT: ADR-002 L1433-1458; zero-E L1151]`
- **`user_preferences.pomodoro_*`** — `pomodoro_work_minutes` (25) · `pomodoro_break_minutes` (5) ·
  `pomodoro_long_break_minutes` (15) · `pomodoro_sessions_before_long` (4). Preferences-owned. `[FACT: ADR-002 L3497-3500]`
- **Types** — `PomodoroType` · `PomodoroStatus` · `PomodoroEntityType` + `PomodoroSession` interface, declared
  once in `@vida/types/note.ts` L58-64,154-163. `[FACT]`

### INTENDED shape (post-reframe → ADR-004 amendment + ADR-002 re-home)
- **Re-home `pomodoro_sessions` into the Sessions realm; re-point at `session_id`.** Replace the polymorphic
  `entity_type`/`entity_id` (PD-1) with a single **`session_id` FK → `sessions`** (the ADR-004 base spine).
  Drop the `entity_type` CHECK. The timer is the `focus` sub-type's runtime; it inherits attachment/analytics
  from the base session (which is what carries the task/habit/workout link). `[INTENT PD-1; FACT superseded: entity_type L1435]`
- **Add runtime richness (restored from v1, PD-5/PD-6):** `paused_at` · `total_pause_seconds` (real-focus
  excludes pauses) · `was_interrupted` · `interruption_reason`. `[INTENT G1a/G1b; FACT v1 studyPlanner.ts PomodoroSession]`
- **Config additions (Preferences, PD-7):** `auto_start_breaks` · `auto_start_next_interval` ·
  `show_notifications` · `play_sounds`. Named **focus templates** are **`focus` Session presets** in the
  Sessions realm (NOT a Pomodoro table) — reuses Sessions `session_templates`/registry. `[INTENT G1c-g; FACT v1 SessionTemplate; Sessions structure-data session_templates]`
- **Relationship to `focus_sessions`.** ADR-004 gives the `focus` sub-type a `focus_sessions` extension table
  (Sessions-owned). The `pomodoro_sessions` runtime row is 1:many under a focus session's intervals (a run =
  several intervals) OR folds into the focus extension — **build-phase modelling decision** (part of the
  ADR-004 amendment). Documented direction: keep a lean interval/runtime row keyed by `session_id`. `[INTENT, build-decision]`

### Superseded (flag LOUDLY — FACT-column supersessions)
- **`pomodoro_sessions.entity_type` CHECK + `entity_id`** (polymorphic Notes attach) → **`session_id`** FK to
  the Sessions base spine (PD-1). `[FACT L1435]`
- **`pomodoro_sessions.page_id`** (Notes page link) → the `/pomodoro` widget links a page to a session via the
  session, not a direct `page_id` on the timer (PD-2); `page_id` retired or demoted. `[FACT L1434]`
- **Sessions SS-11 / identity L50-51 ("Pomodoro is a Notes runtime, not a session")** → reversed ownership:
  runtime lives in the Sessions realm. `[reconcile at build]`

## Client state (ephemeral, not synced)
- **Zustand** owns the live timer tick, current interval type, elapsed/paused seconds, Focus-Mode open state —
  ephemeral UI, never persisted per-tick. Only interval boundaries + completion persist to the row.
  `[FACT: Notes structure-data L23 "pomodoro timer tick" in Zustand]`

## Dependencies / graph
- **Position:** a **client of the Sessions foundation** — inverts the v2 graph where `pomodoro_sessions` sat
  as a leaf under `scheduled_study_sessions`/entities. `[FACT: v2 graph scheduled_study_sessions → pomodoro_sessions L3756; entity_type map L3816]`
- **In-edges:** the `/pomodoro` widget (Notes) launches it; the `focus` Session hosts it.
- **Out-edges (all via the Session's effects, §6):** Tasks (`log_time` → `task_time_logs` `[FACT L1510]`) ·
  Journals (`surface_journal`) · Gamification (`award_xp`, Wave 4) · Global Calendar (`surface_calendar`).
- **Coupling budget:** Pomodoro adds no new cross-module edges of its own — it rides the Session's declared
  effects, so its coupling is the Session's, not additive. `[INTENT]`

## ADRs / structural decisions
- **[ADR-004 — Session Framework](../../core/decisions/ADR-004-session-framework.md)** (Accepted 2026-07-12) —
  the `focus` sub-type + Integration Contract Pomodoro runs on; `attach_pomodoro` effect + base `session_id`.
  `[FACT: ADR-004 §3.2]`
- **ADR-004 amendment (Pomodoro slice) — build-phase** — re-home `pomodoro_sessions` to the Sessions realm,
  re-point at `session_id`, add pause/interruption fields, fold into the `focus` runtime; reverse SS-11's
  ownership half. `[INTENT: note now, amend at build — Victor 2026-07-15]`
- **ADR-002 amendment (consolidated)** — the re-home + column changes join the standing amendment.
- Inherits ADR-001 (SQLite/libsodium) + ADR-003 (LWW sync — the timer row an encrypted blob; travels with its
  base session per ADR-004 §3.4).

## Single source of truth (constitution §3)
- **A running focus timer** — one `pomodoro_sessions` runtime row keyed by `session_id`; no duplicate per app.
- **Interval config** — `user_preferences.pomodoro_*` (Preferences); the runtime reads, never re-stores.
- **Time-to-task** — Tasks `task_time_logs` (one ledger, TK-5) via the Session `log_time` effect; never a
  second Pomodoro counter.
- **Focus stats** — derived on-read from the session log (SS-12); no synced aggregate.
- **`PomodoroType`/`PomodoroStatus` enums** — canonical in `@vida/types/note.ts`; SQL CHECK mirrors them.

## Completion checklist
- [x] data model (FACT base + INTENDED re-home) · [x] client state (ephemeral) · [x] dep graph within budget ·
  [x] ADRs (Session Framework + Pomodoro amendment) · [x] single source per concept ·
  [x] [FACT]/[INTENT] + supersessions (entity_type, page_id, SS-11) flagged loud
</content>
