# fe-onboarding — Step 1 INTERPRETATION

**Unit:** fe-onboarding (LIF-216) · ② Frontend · M1.2.1 · `ext UX-5` · deps flow-session #11 + patterns #2
**Input:** `delivery/baseline.md` (Step 0). **Purpose:** make the implicit explicit before decomposing. Every line is
`[FACT: path:line]` (grounded) or `[INTERPRETATION]` (a reasoned read the gates must ratify). No-Guessing binds.

---

## A. DEPENDENCIES (what must already be true / present)

- **D1 — Shipped first-run onboarding (ratify, do not rebuild).** Render + model + copy-honesty ship
  (`apps/web/src/onboarding/{steps,first-run,onboarding,use-first-run,first-run-repo}.ts`). [FACT: baseline.md §1]
- **D2 — `FlowSessionView` (presentational frame).** `title · stages:FlowStage[] · renderStage?(stage) · action` slot +
  session-only emitters (`onAttach`/`onMarkDone`/`onRequireProof`) + `effects?`. [FACT: flow-session-view.tsx:52-89]
  `[INTERPRETATION]` Guided setup consumes it as a **pure presentational stepped frame** — `stages` = the setup steps,
  `renderStage` = each picker body, `action` = Skip/Continue. It does NOT use attach/proof/effects (guided setup is not a
  persisted session — baseline §3). The `renderStage`+`action` surface is sufficient; no session row, no `useFlowSession`.
- **D3 — `fe-codec-patterns` (#2).** `EmptyState` with the `guidedSetup?: ReactNode` slot [FACT: empty-state.tsx:76];
  8-state machine (`deriveInteractionState`) [FACT: patterns/seam-contract.md:7-33]; `VoiceCopy`+`lintCopy`,
  `ReachabilityRegistry` (≥2-path floor), `ProviderRead` [FACT: patterns/seam-contract.md:82-101].
- **D4 — Theme substrate (fe-codec-theme).** `UIProvider selection={...}` + the preset set; cold-start = `THEME_DEFAULT`
  (Editorial+light+calm). [FACT: App.tsx:7,63,72] The live theme **switcher + Zustand store arrive with a later unit**
  (deferred). [FACT: App.tsx:63]
- **D5 — Module registry.** `MODULE_MAP` (the module roster) + `feature-flags.ts` (`visibleWhen`→flag). [FACT:
  shell/feature-flags.ts:3-4, nav/module-map]
- **D6 — App-mount seam.** `App.tsx` first-run branch; `useFirstRun().markComplete` handoff. [FACT: App.tsx:24,72-80]

## B. NEEDS (what the user must be able to do — the legs)

- **N1 — Reach guided setup (opt-in, ≥2 paths).** From (a) the onboarding completion step (`ready`) as an optional
  "Set things up" branch, AND (b) the `EmptyState.guidedSetup` slot on empty surfaces. [FACT: p5 specimen:164-166 ·
  empty-state.tsx:76 · patterns ReachabilityRegistry ≥2-path] `[INTERPRETATION]` fe-onboarding WIRES the slot content;
  empty surfaces already expose the slot.
- **N2 — Pick modules.** Choose which modules to enable (the `MODULE_MAP` roster), optional, skippable. [FACT: p5:164]
- **N3 — Pick a theme.** Choose a theme preset (the fe-codec-theme set), optional, skippable. [FACT: p5:164]
- **N4 — Skip / never-a-wall.** Every step skippable; dismissing leaves the user in the app, nothing forced. [FACT: p5:166]
- **N5 — Copy-honesty.** All copy obeys BR-4 (M1 local-first, no ZK claim); `lintCopy`/VoiceCopy honesty. [FACT:
  onboarding.md:88-96 · patterns VoiceCopy]
- **N6 — Persist the picks (deferred-seam).** `[INTERPRETATION]` module-enablement → `nav_preferences`/feature-flags
  (M1.1, NOT built) [FACT: feature-flags.ts:4]; theme → the deferred switcher store [FACT: App.tsx:63]. Both are
  **ProviderRead/write seams stubbed in M1**, live-swapped at first consumer (the shell-prefs/spaces-scope precedent).
  [FACT: shell-prefs.ts:6, spaces-scope.ts]

## C. ORGANIZATION (where it lives)

- `[INTERPRETATION]` New guided-setup files under `apps/web/src/onboarding/` (the owning context; CLAUDE.md allows the
  model+chrome to coexist). Candidate shape (decomposition fixes it): `guided-setup.tsx` (the Flow over FlowSessionView),
  `use-guided-setup.ts` (step/selection state + deferred persist seam), `guided-setup-steps.ts` (the step model +
  copy), picker bodies (modules, theme). Reuse — never redefine — `onboarding/*`, `@vida/ui` primitives, patterns.
- No `@vida/ui`/`packages/ui` edit (BR-1) — guided setup composes shipped primitives in apps/web. [FACT: onboarding/CLAUDE.md:18]
- No barrel (STANDARDS §XX). [FACT: onboarding/CLAUDE.md:29]

## D. IMPLICIT RULES (the traps — caught here, not in the browser)

- **IR1 — Guided setup ≠ a persisted session.** Consume `FlowSessionView` presentationally (stages + renderStage +
  action); never wire attach/proof/effects or a `useFlowSession` hook. [FACT: baseline §3 · flow-session slice-map.md:63]
- **IR2 — Guided setup is NOT boot-gated.** Unlike first-run onboarding (which keys on the marker + renders before the
  router), guided setup is **reachable any time** (the EmptyState slot) and is optional. It is NOT a second mandatory
  boot gate. `[INTERPRETATION]` from "opt-in, never a wall" [FACT: p5:166] + the EmptyState reach [FACT: empty-state.tsx:76].
- **IR3 — Picks persist to DEFERRED seams; M1 is honest.** The flow captures selections and calls the stubbed write
  seam (no-op/local in M1); live persistence drops in at M1.1 (modules) / the theme-switcher unit. The flow must NOT
  claim a pick "saved" if the seam is a stub — honest status via patterns SyncStatus/VoiceCopy. [FACT: feature-flags.ts:4, App.tsx:63]
- **IR4 — Theme preview vs persist.** `[INTERPRETATION]` Picking a theme MAY live-preview via `UIProvider selection`
  (app-owned, in-memory) even though PERSISTENCE is deferred — preview is free, persistence is the seam. Decomposition decides.
- **IR5 — Copy-honesty is largely RATIFY.** The `m1`/`m3?` contract ships and renders `m1`-only. [FACT: steps.ts:7-12,
  onboarding.tsx:3-5] surface-map:34's "MISSING copy-honesty" `[INTERPRETATION]` predates the UI-4 render OR means
  "apply the same contract to the NEW guided-setup copy" — i.e. the guided-setup strings get the same `lintCopy`
  treatment. No change to the shipped onboarding copy.
- **IR6 — Module-pick is enable-set, not reorder.** "pick your modules" = which modules are ON (feature-flags/visibleWhen),
  distinct from the shell's nav PLACEMENT prefs (fe-shell owns dock/float/edge). [FACT: feature-flags.ts:3-4 vs shell-prefs.ts:2]
- **IR7 — Render refine vs ratify.** `ext` = extend. `[INTERPRETATION]` The shipped 4-screen first-run render is
  RATIFIED (it passed its own Visual Gate); fe-onboarding adds the guided-setup branch + reach, not a re-skin. Envision
  may surface a feel-refinement, but the structural delta is guided setup, not the existing screens.

## E. BOUNDARY (what fe-onboarding does NOT own)

- Real vault-key / passphrase / unlock-UX → AR-3 / UX-5b / M3. [FACT: onboarding.md:29-37]
- Live `nav_preferences`/feature-flag store (module persistence) → M1.1 Preferences. [FACT: feature-flags.ts:4]
- The theme switcher's Zustand store + its Settings home → fe-settings / the theme-switcher unit. [FACT: App.tsx:63]
- The `EmptyState` component itself → fe-codec-patterns (shipped); fe-onboarding only fills its `guidedSetup` slot.
- Shell nav placement (dock/float/edge) → fe-shell. [FACT: shell-prefs.ts]

## F. ENVISION §3.75 fire-test (determination)

> Test: "Is there a user affordance whose UI answer isn't already obvious from an existing shipped surface?"

**FIRES — YES.** `[INTERPRETATION]` The guided-setup Flow (a skippable module-picker + theme-picker rendered on the
flow-session frame, reachable from completion AND empty surfaces) is a **novel interaction surface** whose layout,
step shape, picker affordances, and skip/never-a-wall feel are NOT obvious from any shipped surface. The onboarding-render
leg alone would SKIP (it reuses shipped screens), but the guided-setup leg is design-led. → **Envision Gate fires; greybox
the guided-setup flow end-to-end (every step × state × skip/continue/preview) for Victor's checkpoint approval before
decomposition.** The RATIFY legs (existing render, copy contract) carry no greybox.

---

## G. Resolution of the 6 BASELINE open questions

1. Consumption fit → **IR1**: FlowSessionView presentationally, no session. ✅ doc-grounded.
2. Persistence seams → **N6/IR3**: deferred ProviderRead/write stubs (modules=M1.1 feature-flags; theme=deferred switcher). ✅
3. Reach paths → **N1**: completion-step branch + EmptyState.guidedSetup slot (≥2-path). ✅
4. Copy RATIFY-vs-gap → **IR5**: RATIFY the shipped copy; apply the contract to new guided-setup strings. ✅
5. Render refine-vs-ratify → **IR7**: RATIFY the shipped 4-screen render; build the guided-setup delta. ✅
6. Envision fire → **§F**: FIRES (guided-setup is design-led). Greybox required. ✅

**Status:** Interpretation complete; all 6 open questions resolved from docs. Next: **Step 1.5 ENVISION** (greybox the
guided-setup flow → Victor pins EC-n checkpoints, BLOCKING) → Step 2 DECOMPOSITION.
