---
Session 1 — 2026-10-27
Goal: Preferences live close — slice R4 reduce-motion (entity-rescope Step 6), LIF-247
Profile: Add Frontend Component / entity-rescope
---

## Accomplished
- Merged origin/main `c09346c` (LIF-250 boot fix + notes close-out); 4 doc conflicts resolved by meaning; tsc 0 + targeted 252/252.
- PLAN-R4 rev 2.1 + IMPLEMENTATION-PLAN-R4 rev 2 (two independent critiques, /preflight PASSED, Approvals 1 + 2).
- Built R4 TDD (steps 1–11): `reducedMotionCss` helper + glob guard, 12 `@vida/ui` gates converted, the hook (context OR OS via uSES), provider prop + attribute effect, Sigma instant camera, shell twin, theme-store nav derivation, App wiring, the Appearance switch on the seam, mirror removal (9 fields).
- Mutations a, a′, b, b′, c–i: 11/11 killed. `@vida/ui` 764/764 · apps/web 999/999 · tsc 0 · eslint 0 errors.
- Live Visual Gate PASS (negative control sensitive; pref on / OS reduce → 0 running; reload first frame `reduce`; EC-10/EC-7/EC-12; Settings light/dark × 375/768/1440 axe 0; keyboard focus ring; read-only disabled; 9/13 gates live cascade-proven, 4 unit-proven). Victor `visual-approved`.
- Pre-ship /critique REVISE (doc currency only) → folded → SHIP. Committed `d381482`, pushed.
- Docs: PLAN/IMPL-R4 · seam contract · B12 · `packages/ui` + `apps/web` layer CLAUDE.mds · preferences current-* · reconciliation · interpretation · shell-rescope edge · decisions.md · components.md · Visual Gate playbook memory.

## Decisions Made
- D-R4-1: the hook reads a provider context fed by the same prop as the attribute — observing the attribute races first paint (React 19 uSES subscribes passively).
- D-R4-2: the attribute's removal lives in its own effect's cleanup — `clearCodec` runs on every preset/density swap.
- D-R4-3: Sigma camera durations 1 ms + `inertiaRatio` 0 — sigma divides by the duration, 0 = NaN frame.
- D-R4-4: only `reducedMotionCss` may emit the media query (glob guard) — stronger than a per-file twin check.
- theme-store (the one PR-5 exemption) derives `reduceMotion` from the nav entry — no second store.

## Open Questions
- none blocking. Watch: 4 gates unit-proven only (no M1 mount) · faint disabled Switch track (DS-level sibling) · F008 load flakes · CI dark (billing) · no PR yet for R1–R4.

## Next Session
First step: R5 Modules + ⌘K — PLAN-R5 from slice-map R5 (§XXVI gate 1) in `.claude/worktrees/preferences-rescope`.
Context to reload: `docs/features/preferences/delivery/slice-map.md` (R5 row) · `reconciliation.md` (R5 rows) · `sessions/PLAN-R4-reduce-motion.md` (pattern + the store-mirror removal) · `.claude/tasks/preferences-rescope.md` · memory `visual-gate-playbook` (harness-drift section).
