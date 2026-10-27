# UX-4 — State Conventions (spec home)

**Issue:** UX-4 `#24` · LIF-93 · M1 / M1.0 · ← UX-1 ✅ · Profile **add-frontend-component** · Scenario `Default`.
**Authority:** STANDARDS engineering.md + §XXII DoD + Capability Framework R5 (terminal states). **Home:** `apps/web/src`, `packages/ui`.

## What UX-4 is

The **interaction-state conventions every screen follows** — empty / loading / error / skeleton, optimistic-update
behaviour, and the keyboard model — defined once so no module reinvents "what loading looks like." A **doc +
declarative artifact** issue (the UX-1/UX-2/UX-3 pattern), not a rendered component. UX-4 **concretizes** the
already-existing `TERMINAL_STATE` canon (`@vida/core`) for the web presentation layer; it invents no vocabulary.

## Files

- [`baseline.md`](baseline.md) — Step-0 ground truth (the state plane is current; the terminal-state canon exists in code).
- [`sessions/PLAN-2026-08-09-ux-4-state-conventions.md`](sessions/PLAN-2026-08-09-ux-4-state-conventions.md) — the forward spec (§XXVI gate 1 · Approval 1).
- `sessions/IMPLEMENTATION-PLAN-2026-08-09-ux-4-state-conventions.md` — build steps (authored after Approval 1 · gate 2).

## Deliverables (target)

1. `docs/core/architecture/state-conventions.md` — the convention model (sibling of ia / command-bar / shell-layout).
2. `apps/web/src/state-conventions/` — the declarative logic artifact (RQ-result → `TerminalState` derivation + keyboard-model data) + layer CLAUDE.md + tests. (A cross-platform slice MAY home in `packages/ui`.)

UX-4 **composes UI-1's existing primitives** ("via UI-1") and **builds no new `@vida/ui` component** — it is
engineering-gated state-conventions LOGIC, classed NOT-visual-gated (`frontend-visual-gate.md:23`). No component
Visual Gate.

## Currency

On close, the model promotes to `docs/core/architecture/state-conventions.md` (+ README row) — §XXIX.
