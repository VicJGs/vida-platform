Date: 2026-09-23 — mod-habits #49 (LIF-125) — M1.1.2 head — ① BACKEND (Entity Delivery Flow) — STARTED
Task: mod-habits · Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow v1) · branch mod-habits (off main)

Goal: build the Habits module ① backend service tier (`createHabitsService`) over the DB-4 habits schema
(`habits` + `habit_completions`) — CRUD, recurrence/time-of-day, quantified completion ledger + mood, derived
streak/completion-rate/mood analytics, build-vs-break, and the cross-module seams (weighted `contributions`
to a Purpose metric · guarded `grant_currency(XP)` effect · journal contribution provider · pages/entity_tags
consumers). ② `fe-habits` (LIF-182) is a separate P6 frontend issue.

Session start:
  - /begin → computed head = #49 MOD-habits per the `#` GLOBAL BUILD ORDER (tracker --next said mod-knowledge,
    advisory only; the `#` order wins for this repo). All 5 blockers Done (mod-notes-and-pages + xs ×4).
  - Standards loaded (engineering · process). Scenario path surfaced (§XXVII HARD GATE) → confirmed.
  - /task-new mod-habits: rewrote the P5 stub into the full task file (Linear LIF-125 bound), scaffolded the
    forward-spec stub (docs/specs/features/mod-habits/_index.md) + registered it, branch mod-habits off main.

Next step: Step 0 document-context BASELINE (refresh habits current-* as ground truth) → Step 1 Interpretation
layer (docs/features/habits/delivery/interpretation.md: dependencies · needs · organization · implicit rules,
each [FACT: path:line]) → Step 2 Decomposition Gate.

Env: Node 24 via nvm for tests (better-sqlite3 ABI). Per-issue branch → PR → merge (foreground).
