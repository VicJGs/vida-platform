# S1 — Guided-setup flow frame · forward spec (§XXVI gate)

**Slice:** S1 (slice-map). **Covers:** EC-2 (never-a-wall), EC-3 (LEFT-rail stepper + position), EC-6 (honest
completion), EC-8/EC-9 frame (responsive + AA). **Plane:** frontend. **No `@vida/ui` edit (BR-1).**

## Deliverables (`apps/web/src/onboarding/`)
1. **`guided-setup-steps.ts`** (data-only) — the ordered flow model:
   - `GuidedSetupStepId = 'modules' | 'theme' | 'done'`; `GuidedSetupStepKind = 'pick' | 'complete'`.
   - `GUIDED_SETUP_STEPS: readonly {id, kind, railLabel, title, body}[]` — `modules`/`theme` = `pick`; `done` = `complete`.
   - Copy is sentence-case, honest (VOICE); lintCopy-clean (no ZK/dead-end). The `done` copy = local-first honest
     ("Your workspace is ready on this device."), no encryption claim (EC-6/EC-7).
2. **`step-rail.tsx`** — `StepRail` (the LEFT vertical stepper, EC-3):
   - Props: `steps: {id, railLabel}[]`, `currentIndex: number`.
   - Renders an ordered `<ol>`-semantic list (role="list"); each step a marker + railLabel. Marker convention
     (done=solid, current=outlined-active — the clearer distinction; reconciled g2 N1): **done = filled brand + ✓** ·
     **current = ring in `$colorBrandEmphasis`** + `aria-current="step"` + bold label · **upcoming = muted ring**.
   - Connector line between markers is decorative (aria-hidden). SR position via `aria-current` + visually-hidden
     "Step N of M" is conveyed by the heading (pageNav), rail is the visual map.
   - Tokens only; no sub-theme. Non-interactive (a progress map, not nav — you move via Continue/Skip).
3. **`use-guided-setup.ts`** — the flow state machine:
   - `useGuidedSetup({ steps, onComplete }) → { index, step, isLast, next, back, skipStep, skipAll, complete, submitting, error }`.
   - `next`/`skipStep` advance; on the `complete` step, `complete()` calls `onComplete()` (Promise) with a re-entrancy
     guard + retryable error (the onboarding.tsx S4-BR-d precedent); `skipAll()` calls `onComplete()` immediately
     (never-a-wall, EC-2). Pure state; NO persistence (seams are S2/S3). Selections held opaquely, passed through later.
4. **`guided-setup.tsx`** — `GuidedSetup({ onComplete, renderStepBody? })`:
   - Two-column layout: `StepRail` (left, fixed-ish width) + content pane (right). At <768 the rail condenses to a
     horizontal top strip (EC-8; the flex-collapse guard — drop flex-grow when stacking [[flex1-child-collapses...]]).
   - Content pane: the current step's heading (focusable `<h1>`, focus on mount+advance = FOCUS_CONTRACT.pageNav) +
     the step body (`renderStepBody(step)` slot — S2/S3 inject; S1 renders a labelled placeholder for pick steps +
     the real `complete` body) + footer.
   - Footer: `Continue` (primary; `Enter Vida` on the complete step) · `Skip this step` (ghost; hidden on complete) ·
     a persistent `Skip setup →` (ghost, right) — EC-2. Retryable error line on complete-failure.
   - Reduced-motion via `useReducedMotion`; motion = opacity/transform only, instant when reduced.

## a11y / rules
- Not an overlay → no Escape-dismiss (OVERLAY_DISMISS out of category, the onboarding.tsx precedent). Skip is the escape.
- Focus: each step transition → the step `<h1>` (FOCUS_CONTRACT.pageNav), keyed remount like onboarding.tsx.
- `StepRail` is a decorative-but-labelled progress map; the accessible position is the heading + `aria-current`.

## States (EC-8/EC-9 — Visual Gate matrix)
default · each step current · complete step · complete-submitting · complete-error · skip affordances present ·
light/dark × reader/editorial/quietDesk × 375/768/1440. AA incl. warm-dark.

## Tests (vitest + Testing Library)
- step model: ids/kinds/order; every copy string lintCopy-clean (0 issues).
- `useGuidedSetup`: next/back/skipStep advance correctly; `complete` calls onComplete once (re-entrancy); reject →
  error set + not-complete; `skipAll` calls onComplete.
- `StepRail`: renders N markers; current has aria-current="step".
- `GuidedSetup`: renders rail + current body + footer; Skip setup present on every step; complete step shows Enter Vida.

## Visual Gate (throwaway harness)
A throwaway standalone entry mounts `GuidedSetup` with placeholder bodies; Brave via playwright-core; screenshot the
matrix; DELETE the harness after (real mount = S4). gate-1 self-critique + g2 code-review before SHIP.
