---
Session 1 — 2026-10-20
Goal: fe-calendar #19 — build S3 (Week/Day renderer) through the full §XXVI stack
Profile: Add Frontend Component (scenario: default — Entity Delivery Flow ②)
---

## Accomplished
- S3 shipped `84ce041` (branch `fe-calendar`, worktree, not pushed): `@vida/ui` `WeekView` (V11, Week AND Day) + pure `internal/week-layout.ts` geometry + surface Week/Day dispatch.
- BR-16 root fix: locale prefs (`timeFormat`, `weekStartsOn`) READ from `preferences-store`; Monday no longer hard-coded in any range (Month passes `CalendarView weekStartsOn`).
- Gates: gate-1 REVISE (12 folded) → SHIP · grounding pass · Approval 1 · preflight PASSED · gate-2 REVISE (10 folded) · Approval 2 · g2 code review (8 folded) · /critique SHIP · Visual Gate PASS (Victor-reviewed).
- Tests: week-layout 23 + week-view 22 + surface +6; @vida/ui 605/605 · @vida/web 677/677.
- Currency docs: v11 spec, ui-2 `_index` (V10 + V11 rows), ui CLAUDE.md, web-client-runtime current-spec, slice-map ledger, seam-contract §A/§B, decisions ledger, components.md.

## Decisions Made
- Visible window auto-extends (hours = minimum) — doc-derived from #19's no-hidden-items charter (EC-3, vision §6) + IR-6.
- Overlapping blocks → side-by-side lanes on DRAWN extents — doc-derived (Sessions intake :113-115, SS-9: the Calendar renders independent sources).
- All-day chips stay undated — doc-fixed (mockup + greybox + seam); a per-chip day would be an addition.
- Calendar reads locale prefs (fe-home READ precedent); shared `mondayOf` defect root-fixed in-unit.
- D-S3-DEV-1 (approved): shared-lane blocks show start only; full range kept for screen readers.

## Open Questions
- Do undated all-day chips read well in the Week range in real use? (Victor's live observation.)
- Pre-existing `packages/ui/src/index.ts:1` triple-slash lint error — `@vida/ui` has no lint script, so CI never runs it; small separate fix.
- Full suites must run sequentially on this machine (parallel runs were reaped under low memory).

## Next Session
First step: S4 — Year renderer (slice-map S4, `YearView`, EC-5): ground in the owner docs + shipped stores FIRST, then PLAN-S4 → §XXVI.
Context to reload: `docs/specs/foundation/fe-calendar/delivery/{slice-map,seam-contract,envision}.md` · `PLAN-S3-week-day-renderer.md` (template) · `packages/ui/src/components/{week-view,calendar-view}.tsx` · `apps/web/src/app/calendar/index.tsx` · greybox `year.png`.
