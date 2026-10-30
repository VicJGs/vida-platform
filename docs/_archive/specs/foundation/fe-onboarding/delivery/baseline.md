# fe-onboarding — Step 0 BASELINE

**Unit:** fe-onboarding (LIF-216) · ② Frontend · Entity Delivery Flow ② · M1.2.1 · Add Frontend Component / default
**Reshape:** G6 #26 — "Onboarding + guided setup" · `ext UX-5` · deps `fe-codec-flow-session` (#11) + `fe-codec-patterns` (#2)
**Date:** 2026-10-11 · worktree `.claude/worktrees/fe-onboarding` off origin/main @ 5ef0ce7, Node 24

> Ground truth for the Interpretation (Step 1) + Envision (Step 1.5) + Decomposition (Step 2) gates. Read-only mapping;
> no scope decided here. The No-Guessing Principle binds: every scope line below is [FACT: path:line], not inference.

---

## 1. What ships today (the terrain — do NOT rebuild)

The first-run onboarding is **already shipped** (UX-5 model LIF-94 + UI-4 S4 render/wiring LIF-89). Code lives in
`apps/web/src/onboarding/`:

| File                | Owner   | What it is                                                                                                                                                                                                                                                                                              |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| `steps.ts`          | UX-5    | `ONBOARDING_STEPS` (4 steps: welcome · privacy · vault · ready) + `OnboardingCopyContract` (`m1`/`m3?`, BR-4 copy-honesty). Data-only, no JSX. [FACT: steps.ts:22-51]                                                                                                                                   |
| `first-run.ts`      | UX-5    | `isFirstRun(flag)=flag!=='1'`, `FIRST_RUN_COMPLETE_KEY='first_run:completed'`, `FIRST_RUN_BRANCH` (App.tsx seam as data). [FACT: first-run.ts:16-37]                                                                                                                                                    |
| `onboarding.tsx`    | UI-4 S4 | `Onboarding({onComplete})` — the full-viewport 4-screen flow; UI-1 `Button`, `PRIMARY_LABEL` per kind, focus-to-`<h1>` (`FOCUS_CONTRACT.pageNav`), no-Escape, progress dots (aria-hidden), reduced-motion, retryable error, re-entrancy guard. Renders OUTSIDE the shell. [FACT: onboarding.tsx:32-133] |
| `use-first-run.ts`  | UI-4 S4 | `useFirstRun(dbReady)` → `{status:'resolving'                                                                                                                                                                                                                                                           | 'onboarding' | 'ready', markComplete}`; write-THEN-flip. [FACT: use-first-run.ts:19-45] |
| `first-run-repo.ts` | UI-4 S4 | `read/writeFirstRunComplete` over `app_state` (`getDbClient().driver`). [FACT: first-run-repo.ts:11-27]                                                                                                                                                                                                 |
| `onboarding.md`     | UX-5    | Authoritative model: M1.0 boundary, first-run contract, a11y/responsive, copy-honesty. [FACT: docs/core/architecture/onboarding.md]                                                                                                                                                                     |

**App mount seam** — `apps/web/src/App.tsx`: `const firstRun = useFirstRun(dbReady)`; loading gate includes
marker resolution; the first-run branch renders `<Onboarding onComplete={firstRun.markComplete}/>` inside `UIProvider`,
BEFORE `<RouterProvider>` (S4-BR-h). Completion writes the marker then flips to the app at `/`. [FACT: App.tsx:24,54,72-80]

**Two-signal independence (load-bearing rule — do NOT break):** the gate keys ONLY on the device-local marker, never
`WorkerDbClient.exists('vida')` — they disagree on first launch by design. [FACT: first-run.ts:3-7 · onboarding.md:64-68]

---

## 2. What fe-onboarding ADDS — the doc-grounded scope (`ext UX-5`)

The reshape tags the shipped onboarding as **"MISSING: optional guided setup; copy-honesty (M1 local-first vs M3 ZK)"**
[FACT: surface-map.md:34]. `ext UX-5` = a new fe-track issue that extends the shipped UX-5, adding what it didn't ship
[FACT: g6-reshape-runbook.md:26 legend]. Two intent legs:

### (a) Optional guided setup — the net-new Flow

Concrete M1.0 definition (the only grounding, the P5 specimen):

- **"Prefer a hand? Start guided setup → (pick your modules & theme — optional, skippable)"** [FACT: p5-discover-own-specimen.html:164]
- **"the empty state does the teaching; guided setup is opt-in, never a wall"** [FACT: p5-discover-own-specimen.html:166 · fe-codec-patterns s3-empty-state.md:34 BR-S3-3]
- Type = **Flow** (archetype), deps #11 flow-session + #2 patterns [FACT: reconstructed-structure.md:51]
- Tied to the personalization model: "states (default) + optional guided setup. Personalization at three grains — ① configure · ② compose · …" [FACT: frontend-quality-bar/_index.md:85]

So guided setup = a **skippable flow to pick modules + pick a theme**, rendered on the flow-session shell, reachable as
an opt-in affordance (NOT a wall). **What persists the picks** (module enablement + theme preset) is a seam to resolve
in Interpretation — candidates: `nav_preferences` (modules) + fe-codec-theme ThemeProvider/preference (theme).

### (b) Copy-honesty (M1 local-first vs M3 ZK)

Already encoded in the shipped model (`OnboardingCopyContract` `m1`/`m3?`, rendered `m1`-only) [FACT: steps.ts:7-12,
onboarding.tsx:3-5]. surface-map:34 lists it as MISSING — likely written pre-UI-4-render, OR means the fuller treatment.
**Reconcile in Interpretation:** is this a RATIFY (already shipped honestly) or a real gap? Default read = largely RATIFY.

---

## 3. Shipped dependencies (consume, do NOT rebuild)

### fe-codec-flow-session (#11, LIF-218-sibling, SHIPPED) — `packages/ui/src/components/flow-session-view.tsx`

- `FlowSessionView` props: `title` (serif H1), `stages: FlowStage[]`, `renderStage?(stage)=>ReactNode`,
  `onAttach`/`onMarkDone`/`onRequireProof`, `effects?`/`effectsState`, `saveStatus` + `action` slots.
  [FACT: flow-session-view.tsx:52-89 · exported packages/ui/src/index.ts:77-83]
- Consumption pattern: the **adapter convention** (pure `toFlowProps` map + intent wiring), mirroring the
  Collection/Dashboard/Entity adapters; the live `useFlowSession(sessionId)` hook is **deferred to the first consumer** —
  slice-map explicitly names **fe-onboarding** as one such first consumer. [FACT: fe-codec-flow-session/delivery/slice-map.md:63, seam-contract.md:6,83-107]
- ⚠ Note: flow-session is built around sessions (deliverable·attach·proof·log, ADR-004). Guided setup is NOT a
  persisted session — Interpretation must decide whether to consume `FlowSessionView` as a pure presentational frame
  (stages = setup steps, no attach/proof) or use a lighter composition. This is the key consumption-fit question.

### fe-codec-patterns (#2, LIF-211, SHIPPED)

- `@vida/ui`: `EmptyState` (with `guidedSetup?: ReactNode` slot — the opt-in setup entry point!) [FACT: empty-state.tsx:65-78,
  seam-contract.md:58], `SyncStatus`/`HonestProgress` [FACT: sync-status.tsx], `useReducedMotion`.
- `apps/web/src/state-conventions/`: 8-state machine (`deriveInteractionState`, `collapseToTerminal`), `ReachabilityRegistry`
  (≥2-path reach floor), `ProviderRead` (cross-module read seam), `VoiceCopy` + `lintCopy` (honesty check).
  [FACT: fe-codec-patterns/delivery/seam-contract.md:7-33,82-101]
- **The `EmptyState.guidedSetup` slot is the shipped reach path**: empty surfaces already expose an opt-in guided-setup
  link slot — fe-onboarding provides what that link opens.

---

## 4. M1.0 boundaries (hard constraints)

- **Auth/vault OFF** — "no SRP/vault-unlock … a trivial local passphrase or none"; encryption pass-through. [FACT: ADR-017:20,22 · ADR-019:20]
- **Copy-honesty (BR-4):** M1.0 MAY claim local-first; MUST NOT claim encrypted-at-rest / zero-knowledge; the `vault`
  step is confirmation-only. Full ZK copy → UX-5b/M3. [FACT: onboarding.md:88-96]
- **Guided setup is OPTIONAL + SKIPPABLE — never a wall.** [FACT: p5 specimen:166]
- **Onboarding is a boot-phase surface, not a nav/overlay surface** — no `/onboarding` route, no Escape-dismiss, not in
  `MODULE_MAP`/`GLOBAL_SURFACES`. [FACT: onboarding/CLAUDE.md:28 · onboarding.md:79-81]
- **Vault-key/passphrase/unlock-UX all defer** to AR-3 / UX-5b / M3. [FACT: onboarding.md:29-37]

---

## 5. Open questions carried to Step 1 (Interpretation) / Step 1.5 (Envision)

1. **Consumption fit:** does guided setup render on `FlowSessionView` (presentational, no session persistence) or a
   lighter flow? (flow-session is session-shaped; guided setup is not a persisted session.) → Interpretation, grounded.
2. **Persistence seams:** what backs "pick your modules" (→ `nav_preferences`?) and "pick your theme" (→ fe-codec-theme
   preset + preference?); are they live or stubbed (the data-plane-defer precedent across prior FE units)? → Interpretation.
3. **Reach / entry points:** guided setup is reachable from (a) the onboarding `ready`/completion step and/or (b) the
   `EmptyState.guidedSetup` slot. Which does fe-onboarding wire? (≥2-path reach floor, ReachabilityRegistry.) → Interpretation.
4. **Copy-honesty leg:** RATIFY (shipped) vs real gap — resolve against the shipped render. → Interpretation.
5. **Onboarding render refinement:** is the shipped UI-4 4-screen render refined/re-designed here, or RATIFIED and only
   the guided-setup entry added? (`ext` = extend, not rebuild.) → Interpretation + Envision.
6. **Envision §3.75 fire-test:** guided setup is a novel user affordance (a module+theme picker flow) whose UI answer is
   NOT obvious from a shipped surface → **Envision likely FIRES**; the onboarding-render leg alone (reusing shipped
   screens) would not. State the result explicitly at Step 1.5.

---

## 6. BASELINE verdict

Terrain mapped, scope doc-grounded. fe-onboarding is **not** a from-scratch onboarding build — the first-run render +
model + copy-honesty contract ship. The net-new is the **optional/skippable guided-setup Flow (pick modules + theme)**
on the shipped flow-session + patterns substrates, plus a copy-honesty reconcile and the guided-setup reach wiring.
No gap requires invention; the consumption-fit + persistence seams are the real Interpretation work. Ready for Step 1.
