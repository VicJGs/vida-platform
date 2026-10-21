# Task: module-go-lives (BACKLOG QUEUE — approved for the next fresh session)
# Status: SUPERSEDED 2026-10-21 by golive-replan (docs/specs/foundation/golive-replan/) — "go-live" retired as a unit type; the queued items become entity-rescope debt units homed at G2–G4. Kept as the G1 census seed.
# (was: approved-queue, direction approved by Victor 2026-10-20)
# Created: 2026-10-20
# Milestone: M1 — per-module usability (the swap-ready fleet the data plane enabled)
# Pattern established by: notes-entity-usability (PR #150) — the reference implementation

## What this is
The already-built frontend surfaces are honest-empty **stubs**; the live data plane (`data-plane-wiring`, PR #148)
+ the composition-root singleton make each one flippable. This file is the **approved queue** of per-module
"go-lives" to make them usable, for a fresh session to work top-down.

**"Approved" = direction/priority is approved** (go make these usable, in this order). It does NOT skip the gates:
each item is its OWN owned completion and runs the full §XXVI stack in-session (triage → PLAN → /critique →
/preflight → Approval 1 → IMPLEMENTATION-PLAN → /critique → /preflight → Approval 2 → build → verify live in Brave).
Ground every scope line in the docs first (the notes unit is the worked precedent); never blanket-flip sight-unseen.

## The shared go-live pattern (per module)
1. **Register the service** in `apps/web/src/db/composition-root.ts` (`Services` type + `build()` construction,
   dep-order per the service's `types.ts`). `journals` is ALREADY registered; others are net-additive.
2. **Flip the stub hooks** → `useQuery`/`useMutation` over `(await getServices()).<svc>...` (BR-RT-2/4: invalidate +
   re-read, no optimistic). Keep the `?sample` DEV path for the Visual Gate.
3. **Wire interactions** (open/create/edit) the surface needs, mirroring S1/S2 of notes.
4. **Verify LIVE in Brave on the real OPFS worker** (not jsdom) + unit tests + tsc/eslint + promote durable docs (§XXIX).
5. Watch the gotchas: [[repository-writes-need-initvault-even-in-m1]] (initVault is done globally now) ·
   [[tiptap-onchange-fires-on-mount-dedupe-content-writes]] (any editor surface) · verify live, not just jsdom.

## Approved queue (priority order — re-confirm each at its in-session triage)
1. **home / journal** — flip the home journal region (currently a placeholder) to the live `journals` service
   (already in the composition root). Highest value: home is the daily dashboard. Deferred-substrate home is DERIVED
   ([[deferred-substrate-home-is-derived-not-chosen]]). Files: `apps/web/src/home/*`, `journals` service.
2. **settings** — register `preferences` service + flip `settings/*` to read/write `user_preferences`/`nav_preferences`.
   Also unblocks the later `note-open-behavior-preference` task (needs a preference field + a settings control).
3. **notifications** — register `notifications` service + flip `notifications/use-notifications.ts`. Note the summary's
   caveat: may need the notification engine + preferences wired; triage that dependency first.
4. **gamification** — register `gamification` service + flip `use-gamification`/`use-achievements`/`use-currencies`/
   `use-rules` (several hooks; XP/achievements/currencies derived-balance ledger per ADR-012).
5. **session-hud** — register `sessions` service + flip `session-hud/use-active-session.ts` (active-session display).

## OUT (not go-lives — do not fold in)
- `fe-calendar` — still BEING BUILT (worktree `.claude/worktrees/fe-calendar`, S5 pending). Not a flip.
- Modules with NO built frontend yet (finance, tasks, habits, projects, relationships, learning, …) — those are
  future fe-* BUILDS, not go-lives. Only the 5 built surfaces above qualify now.
- Notes editor BODY multi-device CRDT merge (M4) · `[E]` encryption (M3) · FTS5 search (DB-8).

## Dependencies
- Blocked by: none (data plane + initVault live; services exist). Each item independently shippable.
- `note-open-behavior-preference` depends on #2 (settings/preferences) landing first.

## Route History
- 2026-10-20 — Queued + direction-approved by Victor after notes-entity-usability (PR #150) proved the pattern.
  Enumerated from the built apps/web surfaces with stub hooks + an existing @vida/core service.
