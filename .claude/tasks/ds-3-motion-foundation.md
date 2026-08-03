# Task: ds-3-motion-foundation
# Status: done (2026-08-03)
# Profile: Design System
# Scenario: Default
# Linear: LIF-83
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ③ Design System

## Goal
Define the motion foundation: the duration and easing scales plus the reduced-motion + safe-property
contract that every animated component honors. Keeps transitions consistent and accessible before any
animated UI is built. Grounded in `standards/motion.md §IX` (timing bands, the 3 cubic-beziers,
animate-only transform/opacity/clip-path, reduced-motion).

## Dependencies
- blocked by `ds-2-foundations` (← DS-2, reconstructed-structure #18; DS-1 pipeline + DS-2 aux-namespace
  precedent both on main). DS-2 DONE 2026-08-03.

## Approach (grain)
Motion primitives (`duration.*` + `easing.*`) reuse DS-2's **aux-namespace precedent** exactly — routed to
`variables.css` + a new typed `motion.ts` (analogous to `fonts.ts`), **skipped** from `tokens.ts`/`themes.ts`
createTokens (motion is not a Tamagui category). Semantic "transition presets" (pairing duration+easing) +
`createAnimations` driver = DS-4. Reduced-motion + safe-property list = documented contract, enforced at the
component gate (DS-5/UI-*), not build-enforced here.

## Scenario Path (§XXVII, surfaced + approved 2026-08-03)
1. Baseline + LITE spec · 2. Author motion tokens · 3. Build + validate ·
4. Frontend Visual Gate (preview:tokens + Victor approval) · 5. Currency §XXIX + close. — ALL DONE.

## Outcome (2026-08-03) — DONE
Motion foundation shipped: `duration` (instant 0/fast 150/moderate 250/slow 400, unitless ms) + `easing`
(out/in/inOut cubic-beziers + linear) primitives added as a **third aux consumer**. `AUX` factored
`[...TYPOGRAPHY, 'shadow', ...MOTION]`; `vida/fonts` filter narrowed to typography (closed the fonts↔motion leak
by construction); new `vida/motion` format → `motion.ts` (mirrors `fonts.ts`); index re-export; B11/B12.
Values trace to `standards/motion.md §IX`. **@vida/ui 26/26 · root typecheck 10/10 · deterministic.**
Two critiques (plan REVISE→fixed 5; post-impl SHIP + 2 NITs) + live-smoke caught a preview render bug
(cubic-bezier commas → isShadow miscapture) + Victor's Visual-Gate fix (`instant` static, not a flicker-loop).
**Frontend Visual Gate PASS** (2nd run; values standard-derived, not a placeholder). §XXIX docs promoted
(current-spec/current-business-rules B11/B12 + themes layer-doc = B12 enforcement artifact).
Spec: `docs/specs/components/ds-3-motion-foundation/_index.md` (implemented). Unblocks DS-4.
Merged + pushed to origin/main (`8f9cbe2`, --no-ff of `ds-3-motion-foundation`); branch deleted; re-verified
green (26/26 · 10/10). LIF-83 → Done.
Next head: DS-4 (Tamagui config + dark mode + createFont/createAnimations wiring).
