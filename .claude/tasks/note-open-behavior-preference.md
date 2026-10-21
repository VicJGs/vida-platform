# Task: note-open-behavior-preference
# Status: flagged / backlog (tracked — NOT started; split out of notes-entity-usability on 2026-10-20 per Victor)
# Linear: LIF-238
# Profile: Greenfield-ish (spans preferences schema + settings UI + an IA/shell decision)
# Created: 2026-10-20
# Project: M1 — Whole Manual OS
# Milestone-note: M1.x+ (DERIVED later — depends on the IA tab-workspace decision below; NOT M1 usability). No milestone header until derived (golive-replan G4: a free-text Milestone header mints a junk Linear milestone).
# Split-from: notes-entity-usability (the BR-NEU-2 create-behavior decision)

## Goal
Make the "what happens when you create/open a note" behavior **user-configurable in Settings**, including an
**open-in-a-new-tab** mode. Victor's intent (2026-10-20): "it could happen both things [create-and-open AND
create-stay-on-list], but [one] would create the note in a new tab, and it needs to be personalized by the user
on settings."

## Why this is its own task (NOT folded into notes usability) — doc-grounded findings
Investigated on 2026-10-20; the requested capability is **net-new / undocumented**:
1. **No preference field exists** for note create/open behavior. `user_preferences` has ~35 config fields but none
   for this [FACT: `packages/core/src/db/schema/preferences.ts:42-89`]. Adding one = net-new column + a migration +
   a Settings control.
2. **No in-app "tab" / multi-document workspace concept exists** in the IA. "Tabs" across the docs mean only
   entity-facet tabs (merged/tabbed note page) and module sub-tabs — never a browser-style open-in-its-own-tab
   workspace [FACT: `docs/specs/foundation/frontend-replan/surface-map.md:43,61,62`]. So "open in a new tab" is
   EITHER a raw browser-tab `window.open('/notes/$id')` OR requires designing a whole multi-document workspace —
   an **IA/shell decision that likely needs its own ADR**, not an invented bolt-on.
3. No Settings control for any of this is documented.

## Scope (to be refined when activated)
- **Decide the tab model first (IA/ADR):** does Vida get an in-app multi-document tab workspace, or is "new tab" a
  browser tab (`window.open`)? This is the gating question — resolve before building the preference.
- Add the preference field(s) to `user_preferences` (+ migration) for note create/open behavior
  (e.g., `note_open_behavior`: open-in-place | open-in-new-tab | stay-on-list).
- A Settings control to set it.
- Wire `notes/use-create-note` + `note-renderers` open handlers to honor the preference (replacing the hardcoded
  create-and-open default shipped by `notes-entity-usability`).

## Dependencies
- Blocked by: an IA/shell decision (ADR) on the tab/multi-document workspace model (undocumented today).
- Relates to: `notes-entity-usability` (ships the hardcoded create-and-open default this task later makes configurable).
- blocked by `preferences-rescope`

## Grounding references
- `packages/core/src/db/schema/preferences.ts` (no field today) · `surface-map.md` (no tab workspace) ·
  `notes-entity-usability` PLAN §BR-NEU-2 (the decision that spawned this) · ADR-006 (Spaces/nav) for IA precedent.

## Route History
- 2026-10-20 — Flagged + tracked. Split from `notes-entity-usability` at Victor's direction ("flag the preference to
  another task, don't defer it"). The usability unit ships create-and-open (in place) as the M1 default; this task
  owns the configurable + new-tab behavior, gated on the IA tab-workspace decision.
