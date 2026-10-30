---
Session 1 — 2026-10-22 (opened 2026-10-21)
Goal: fe-calendar #19 (LIF-203) S7 — the Entity Live Close (live `useCalendar` fan-out)
Profile: Add Frontend Component · scenario default (Entity Delivery Flow ②)
---

## Accomplished
- **S7 shipped + merged** — `cc0e350` → PR #157 merged `98c6107`; LIF-203 → Done. The Global Calendar (6 ranges) reads
  live data on real OPFS, read-only (proven on a live vault with a write-spying driver, mutation-checked).
  - `apps/web/src/db/composition-root.ts`: pure exported `composeServices` — sessions (SessionRegistry + EffectRail over
    an empty effect registry) · habits · tasks · purposes · relationships + the tasks/purposes/relationships dueIn lanes.
  - `apps/web/src/app/calendar/{use-calendar,calendar-derive,calendar-sample}.ts` — `calendarQueries` (allowlisted reads,
    `['calendar',…]` keys) → `useQueries`; pure derivations (2 dueIn calls per span, tasks via the open-tasks join, Must
    from `obligation`, threads incl `off`, honest budget, open time, slip, record/done/focus); fixtures → DEV `?sample`.
  - `@vida/ui`: V13 `color?` + `off`; CalendarView `, today` + controlled unfurl (EC-F3); `pulseKey` + `RangeTransition`
    (EC-F2) via `internal/calendar-motion.ts`.
- Gates: PLAN g1 ×2 → Approval 1 → preflight → g2 → Approval 2 → 14 build steps → g2 code review (15 folded) → /critique
  SHIP → **live Visual Gate PASS (Victor)**: seed → reload → persists → reopen 0 writes; 108 cells 0 overflow · axe 0 · AA.
- Linear: 8 `related` borrowed-leg edges on LIF-203 + comments on LIF-203/248/246.
- **Filed LIF-250** `fix-data-plane-boot-open` — bug unit `docs/specs/fixes/data-plane-boot-open/`; plan
  (`golive-replan/debt-plan.md` §1), order (`reconstructed-structure.md` #60 — renumbered 1→144; `g3-order.md` L0′);
  HARD-4 ← LIF-250.
- Committed the prior session's S5/S6 close-out records (branch `fe-calendar-closeout`).

## Decisions Made
- D-S7-DEV-1: due-work = `sessions.dueIn` (the Calendar is the dueIn aggregator, IA §4) — supersedes slice-map D2.
- S7 registers the five services + lanes (PLAN-S6 §1 homing + first-consumer-pull); sessions-rescope ratifies.
- Must/Can: `kind:'obligation'` → must; standard → no weight (tasks intake G8:84).
- D-S7-DEV-4 (Victor): Living carries past-in-week relationships items into today (REL-36), plain.
- R17 Week-strip density kept as approved (Visual Gate PASS).
- Victor drift corrections: sessions placement is NOT deferred (sessions entity, LIF-198); timezone = the user's location
  (settled) → memory.
- Merged #157 on local-green (CI "not started — account payments failed").

## Open Questions
- LIF-250 root cause unknown; the production build cannot open its DB → Year switch timing (1.5–2.6 s dev,
  render-bound) can't be measured in prod until it lands.
- GitHub Actions billing — CI dark again.
- `@vida/core` vault 1 MB timeout (F011, pre-existing).

## Next Session
First step: `/begin` → **LIF-250 `fix-data-plane-boot-open`** (first in the debt order, structure #60 / L0′ — every live
surface sits behind the boot), unless `tracker_sync --next` + Victor pick the Wave L1 debt (preferences-rescope) first.
Context to reload: `docs/specs/fixes/data-plane-boot-open/_index.md` · `apps/web/src/db/{client,boot,worker}.ts` ·
`apps/web/vite.config.ts` · `.claude/knowledge/failure-patterns/known-failures.md` F007.
