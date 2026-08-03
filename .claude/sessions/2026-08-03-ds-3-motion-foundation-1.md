---
Session 1 — 2026-08-03
Goal: DS-3 Motion foundation — the duration + easing scales + reduced-motion/safe-property contract that every animated component honors, before any animated UI is built.
Profile: Design System (Scenario: Default, LITE gate)
---

## Accomplished
- Shipped the **motion foundation** for `@vida/ui`: `duration` (instant 0 / fast 150 / moderate 250 / slow 400, unitless ms) + `easing` (out/in/inOut cubic-beziers + linear) primitives, grounded in `standards/motion.md §IX`.
- Extended the token pipeline as a **third aux consumer** (reusing DS-2's aux mechanism): `AUX` factored `[...TYPOGRAPHY, 'shadow', ...MOTION]`; `vida/fonts` narrowed to TYPOGRAPHY (closed the fonts↔motion leak by construction); new `vida/motion` format → GENERATED `motion.ts` (mirrors `vida/fonts`, both sort layers); `motion.ts` registered + `index.ts` re-export.
- Added B11 (motion primitives, aux-routed, standard-aligned) + B12 (motion contract — reduced-motion + safe-property; documented, component-gate-enforced).
- Extended the visual-render (`render-token-preview.mjs`) with a motion section: 4 durations × 4 easings, animate transform+opacity only, honor `prefers-reduced-motion`; `instant` renders as an immediate static state.
- Verified: `tokens:build` deterministic · **@vida/ui 26/26** (20 DS-2 + 6 DS-3) · **root typecheck 10/10**.
- §XXIX docs promoted: `docs/ui/token-pipeline/current-spec.md` + `current-business-rules.md` (B11/B12) + `packages/ui/src/themes/CLAUDE.md` (B12 enforcement artifact). Spec `docs/specs/components/ds-3-motion-foundation/_index.md` (implemented).
- Merged + pushed to `origin/main` (`8f9cbe2`, --no-ff; doc follow-up `77c5386`); branch deleted; re-verified green on merged main. Linear LIF-83 → Done.

## Decisions Made
- **Third aux consumer, not a new pipeline concept** — motion reuses DS-2's aux mechanism verbatim (`motion.ts`↔`fonts.ts`). Motion is primitive-only; semantic transition presets (duration+easing pairs) = DS-4 `createAnimations` (the 3-layer model can't express a two-value pair without a B2 violation).
- **Leak-proof by construction** — factored `AUX` into destination sub-lists so the fonts emitter can't match motion (vs a fragile flat-list + `ns==='shadow'` exclusion).
- **Unitless durations** (`150`, not `"150ms"`) — consistent with DS-2's unitless-dimension convention; `ms` reconciliation joins the existing `px` deferral to DS-4.
- **Band-floor speeds** (150/250/400, snappy bias) + **curve-shape easing names** (out/in/inOut/linear) — both in-band/standard; intent aliases (enter/exit/loop) → DS-4 presets.
- **`type: "easing"`** for all easing tokens (post-impl NIT) — honest metadata; `linear` isn't a cubic-bezier, and `type` is inert (`transforms: []`).

## Open Questions
- `createAnimations` config shape is driver-dependent (CSS driver = duration+easing; RN driver = spring configs, no cubic-bezier easing) — DS-4 picks the driver and reconciles what `motion.ts` feeds it. `[UNKNOWN → DS-4]`
- Lone camelCase `--easing-inOut` CSS var (from the `inOut` key; consistent with existing `--fontSize-*`) — reconciled with the deferred CSS-var/unit pass at DS-4.

## Next Session
First step: **DS-4 (Tamagui config + dark mode)** — reconstructed #19, ← DS-3, Design System. Wire `createTamagui` + the dark-mode *mechanism* (theme-switch) + `createFont`←`fonts.ts` + `createAnimations`←`motion.ts`, and resolve the CSS-var/unit (px + ms) reconciliation deferred through the whole DS chain. (Note: `tracker --next` nominally points at `ux-3` by dependent-count; DS-4 is the doc-authoritative DS-track continuation.)
Context to reload: `docs/ui/token-pipeline/current-spec.md` + `current-business-rules.md` (the pipeline as-is, incl. B11/B12 + DS-4 boundaries), `packages/ui/src/themes/{tokens.ts,themes.ts,fonts.ts,motion.ts}` (what DS-4 consumes), `standards/design.md §XI` (dark mode) + `motion.md §IX`, reconstructed-structure #19.
