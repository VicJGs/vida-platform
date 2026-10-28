# fe-onboarding — Step 2 DECOMPOSITION · slice-map

**Unit:** fe-onboarding (LIF-216) · ② Frontend · M1.2.1 · `ext UX-5`
**Inputs:** baseline.md · interpretation.md · envision.md (EC-1…EC-10, APPROVED). **Mode:** decide (net-new flow).
**Boundary:** fe-onboarding owns the net-new **guided-setup Flow** + its reach wiring. RATIFY (not rebuilt): the shipped
first-run 4-screen render + the `OnboardingCopyContract` model.

> All slices `frontend`. Each ships through the §XXVI double-gate + a blocking real-browser Visual Gate before the next
> begins. Unit PR opens at the final slice. No `@vida/ui`/`packages/ui` edit (BR-1) — compose shipped primitives in apps/web.

---

## Scene-F resolution (grounded — the Envision flag)

**Build a lighter purpose-built flow frame; do NOT consume `FlowSessionView` #11.** Grounds:

1. **Real misfit:** `FlowSessionView` renders unsuppressable SESSION affordances on the current stage — `Mark done ·
Require proof · Attach Document/Photo/Audio` [FACT: flow-session-view.tsx:170-177, no prop gates them] — meaningless
   on "pick your modules."
2. **Layout mismatch:** EC-3 is a left-rail stepper **beside** content; `FlowSessionView` is a stacked Timeline with
   per-stage bodies [FACT: flow-session-view.tsx:241-253]. Different shape.
3. **The dep is build-order, not import.** The reshape `dep` column = "blocked-by slugs" [FACT: g6-reshape-runbook.md:26
   legend]. fe-onboarding ships after flow-session; it is not required to import the component when it misfits.
4. We still **reuse the shipped pattern-kit** (#2): `EmptyState`, `Button`, `Card`, `VoiceCopy`/`lintCopy`,
   `ReachabilityRegistry`, `ProviderRead`, `useReducedMotion`, the 8-state `deriveInteractionState`. No re-authoring.

---

## Slices

### S1 — Guided-setup flow frame (left-rail stepper + skippable chrome + completion)

**Covers:** EC-2 (never-a-wall skip/escape) · EC-3 (LEFT-rail vertical stage indicator + current position) · EC-6
(honest completion → Enter Vida) · EC-8/EC-9 (responsive + AA for the frame).
**Build (`apps/web/src/onboarding/`):**

- `guided-setup.tsx` — the flow shell: a two-column layout (left: `StepRail`; right: the active step body + footer).
  Footer = `Continue` / `Skip this step` + a persistent `Skip setup →`. Completion step = honest copy + `Enter Vida`.
- `step-rail.tsx` — the persistent LEFT vertical stepper (ordered steps · done/current/upcoming · current emphasized;
  decorative + an SR-correct position announcement). Local component (Tamagui + tokens; `useId` labelling).
- `use-guided-setup.ts` — the flow state machine: current step index, held selections, `next`/`back`/`skipStep`/
  `skipAll`/`complete`; reuses the 8-state convention where a step body is async. No persistence logic (that's the seams).
- `guided-setup-steps.ts` — the ordered step model (id · title · kind) + copy (lintCopy-clean). Data-only (steps.ts sibling).
  **Visual Gate:** left-rail + current marker across 3 presets × L/D × 375/768/1440; skip/escape present; AA incl warm-dark.

### S2 — Step 1: module enable-set picker

**Covers:** EC-4 (MODULE_MAP dock roster as grouped toggles, optional).
**Build:** `module-picker.tsx` (`ModulePickerView` state-as-prop + a thin hook shell) + `use-module-selection.ts`
(selection state + the deferred **module-enablement write seam**, stubbed). Rows = the `MODULE_MAP` `placement:'dock'`
roster grouped by `ModuleGroup`; each a keyboard-operable toggle (`aria-pressed`). Pure projection in `modules.ts`.
**Visual Gate:** grouped toggles, on/off states, keyboard, AA, 375 reflow.

### S3 — Step 2: theme picker + live preview

**Covers:** EC-5 (THEME_PRESETS as swatches; selection live-previews).
**Build:** `theme-picker.tsx` (`ThemePickerView` + hook shell) + `use-theme-selection.ts` (selected preset + the
deferred **theme-persist write seam**, stubbed; live preview via the app-owned `UIProvider selection` lever —
interpretation IR4). Swatches = the 3 presets with per-preset token bands; selected reflects + previews.
**Visual Gate:** swatches × 3 presets × L/D; selection reflect; live preview; AA.

### S4 — Reach wiring (opt-in, ≥2 paths) + unit PR

**Covers:** EC-1 (reach from post-first-run invitation + the `EmptyState.guidedSetup` slot).
**Build:** `guided-setup-entry.tsx` (the post-first-run invitation surface — an `EmptyState`-composed opt-in offered
after `useFirstRun` completion / on the onboarding `ready` step) + fill the `EmptyState.guidedSetup` slot content for
empty module surfaces + register both paths in the `ReachabilityRegistry` (≥2-path floor). Wire the app-mount
(where the invitation shows; the route/overlay for the flow — grounded to the onboarding boot seam, NOT a nav route).
**Visual Gate:** both reach paths render; opt-in/skippable; AA. **PR opens here.**

**Cross-cutting (every slice's Visual Gate MUST):** EC-7 copy-honesty (lintCopy, no dev strings) · EC-9 AA full matrix
· EC-10 feel (reduced-motion calm) rides the live gate.

---

## Intent Coverage Gate (every structural EC homed)

| EC                          | Slice           | Plane                       |
| --------------------------- | --------------- | --------------------------- |
| EC-1 reach ≥2-path          | S4              | frontend (Visual-Gate MUST) |
| EC-2 never-a-wall           | S1              | frontend                    |
| EC-3 LEFT-rail stepper      | S1              | frontend                    |
| EC-4 module picker          | S2              | frontend                    |
| EC-5 theme picker + preview | S3              | frontend                    |
| EC-6 honest completion      | S1              | frontend                    |
| EC-7 copy-honesty           | S1–S4           | frontend (cross-cut)        |
| EC-8 responsive             | S1–S4           | frontend (cross-cut)        |
| EC-9 AA matrix              | S1–S4           | frontend (cross-cut)        |
| EC-10 feel                  | S1–S4 live gate | feel                        |

**0 unhomed · 0 EC without a slice.** RATIFY legs (shipped render + copy model) carry no slice by design (IR5/IR7).

## Deferred (homed, not dropped)

- Live module-enablement persistence → M1.1 `nav_preferences`/feature-flags (S2 write seam stubbed). [FACT: feature-flags.ts:4]
- Live theme-persist → the deferred theme-switcher store (S3 write seam stubbed; preview works now). [FACT: App.tsx:63]
- Vault/passphrase/unlock → AR-3/UX-5b/M3 (out of boundary). [FACT: onboarding.md:29-37]
