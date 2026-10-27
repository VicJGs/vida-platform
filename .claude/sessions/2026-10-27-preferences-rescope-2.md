# Session — preferences-rescope (LIF-247) · 2026-10-27 · #2

## Accomplished
- R6 Locale + Notifications, §XXVI gate 1 complete: PLAN-R6 rev 3 — **Approval 1 (Victor)**.
  - 1a re-sweep of `docs/modules/preferences/current-spec.md` (fe-calendar mirror reader; bridge owns the hide flush).
  - Gate-1 independent critique REVISE ×4 → folded (rev 2). Victor "check the documentation" → governing-doc check → rev 3.
- Gate 2 started: IMPLEMENTATION-PLAN-R6 rev 1 · `/preflight` PASSED.

## Decisions
- Delete `preferences-store` (BR-RT-7); bridge → `PreferencesHideFlush`.
- Notes `CalendarView` not wired (NOT-48: Note has no Calendar); Global Calendar is the week-start reader.
- Activity times via native `Intl` with `hourCycle` (BR-S5-8); 12h `2:05 PM`, 24h `14:05`.
- EC set for the panes: fe-settings EC-1/2/3/6/7/10/11 (slice-map's EC-4 cite was wrong).

## Lessons
- A slice-map/ledger line written from a code sweep is not intent — check the owning module's governing view set first.
- Never claim "same shape as Y" from code; find the doc that pins it or say UNKNOWN.

## Next Session
First step: gate-2 independent /critique on `docs/features/preferences/delivery/sessions/IMPLEMENTATION-PLAN-R6-locale-notifications.md` → fold → Approval 2.
Context: PLAN-R6 rev 3 · IMPL-PLAN-R6 · task file · memory `visual-gate-playbook`.
Watch: Node ≥ 22 for suites · uncommitted plan docs · tracker sync must run from the main checkout.
