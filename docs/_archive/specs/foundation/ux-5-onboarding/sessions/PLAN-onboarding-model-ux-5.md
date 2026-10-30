# PLAN — UX-5 First-Run Onboarding Model (gate 1 · the SPEC)

**Unit:** UX-5 (LIF-94) · M1.0 · new-feature / Default
**Deliverable class:** design MODEL (doc + declarative artifact) — no rendered component, no Visual Gate (→ UI-4).
**Baseline:** `../baseline.md` (grounded map + feature brief). No-Guessing binds every claim.

---

## §1. Context (grounded)

The web app boots through `App.tsx` `[FACT: apps/web/src/App.tsx:11-57]`: `ensureDbReady()` → three branches
(error+Retry · "Loading…" splash · `QueryClientProvider ⊃ RouterProvider`). There is **no first-run branch**.
The first-run signal exists (`WorkerDbClient.exists('vida')` `[FACT: db/client.ts:120]`), and a precise
completion marker can live in `app_state` — a device-local `{key,value}` KV store, not synced
`[FACT: packages/core/src/db/schema/foundation/app-state.ts:18-21]` (the `@vida/core` query mirror of the DB-7
`ensureInfra` bootstrap DDL — `migrations/runner.ts` — where the write path lives). Auth is **off** in M1.0 — "trivial local passphrase or none"
`[FACT: ADR-017:22]`; the vault key (AR-3) and unlock-on-launch (UX-5b) are **M3**. UX-4/UX-3 provide reusable
conventions (`FOCUS_CONTRACT`, `OVERLAY_DISMISS`, breakpoints, `overlayHost`) `[FACT: state-conventions/*, shell/*]`.

**This unit produces the design model UI-4 implements. It renders nothing and changes no existing file.**

---

## §2. Business rules / invariants (the model's rules)

- **BR-1 — Mandatory, one-time gate.** First-run onboarding is a required boot-phase full-viewport surface,
  shown iff the completion marker is unset. It is **not** an `overlayHost` overlay (it renders _before_ the router,
  not inside the shell), so `OVERLAY_DISMISS` — which governs overlays: modal/drawer/dropdown/popover — is **out of
  scope by category** `[FACT: apps/web/src/state-conventions/keyboard.ts:42 + comment]`. We additionally state
  **no-Escape** explicitly so UI-4 does not add it by habit: a mandatory first-run gate must not be Escape-skipped;
  the user advances via explicit controls only.
- **BR-2 — Completion marker is device-local + idempotent.** Stored as `app_state['first_run:completed'] = '1'`.
  Absence = first run. Reusing `app_state` = no new table, no migration (a boolean does not earn a table)
  `[FACT: packages/core/src/db/schema/foundation/app-state.ts:18-21]`. The key is a **reserved convention** this
  unit documents; the read/write is wired by UI-4/impl (via `Repository`/`run`). The colon-namespaced key is
  deliberately **distinct** from the synced `UserProfile.onboarding_completed` `[FACT: packages/types/src/entities/user.ts:61]`
  (a cross-device _user_ flag whose table lands M1.1+) — this is a device-local "this device saw first-run" marker,
  never synced; reconciling the two is a UX-5b / M1.1 concern.
- **BR-3 — Crypto is a deferred seam, never presumed.** No step in the model reads or creates a vault key. The
  vault-creation step is designed as a **seam** whose M1.0 impl is "none/trivial" `[FACT: ADR-017:22]` and whose
  real impl is AR-3 / UX-5b (M3). Nothing here blocks on M3.
- **BR-4 — Copy honesty (matches shipped reality).** The expectation-setting copy must be true at ship time.
  M1.0 (encryption off) claims **local-first** ("your data lives on this device") — which is true — and marks the
  full crypto-backed zero-knowledge promise as **revealed when AR-3 lands (M3)**. The design defines the content
  _contract_ (what each state may claim), not final marketing prose.
- **BR-5 — Reuse, never redefine.** Focus behavior = UX-4 `FOCUS_CONTRACT` (each step transition = `pageNav` →
  main-heading; a focusable control receives initial focus). Responsive = UX-3 `PRIMARY_TEST_WIDTHS` (375/768/1440)
  for the render, `BREAKPOINTS` incl. `wide`/1920 for max-width containment, content centered within
  `CONTENT_MAX_WIDTH` (1280) `[FACT: apps/web/src/shell/breakpoints.ts:26,29]`. Onboarding is **not** a
  `MODULE_MAP`/`GLOBAL_SURFACES` entry `[FACT: apps/web/src/nav/module-map.ts]` — it is a boot-phase surface, time-bound to first run.
- **BR-6 — Terminal states.** A step with async work derives state via UX-4 `deriveTerminalState` (loading/empty/error/
  success); the M1.0 steps are synchronous, so most are `success`-only. No new state vocabulary.

---

## §3. The design

### §3.1 The flow — ordered step model

Four steps, advanced by explicit primary action (BR-1):

| #   | Step id   | Kind           | Intent                                                                  | M1.0 impl                                                                                     | Deferred                                       |
| --- | --------- | -------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | `welcome` | `intro`        | What Vida is (one line) + "Get started"                                 | render                                                                                        | —                                              |
| 2   | `privacy` | `explain`      | Local-first expectation-setting (BR-4); trust moment                    | render (local-first copy)                                                                     | full ZK-crypto claim → M3                      |
| 3   | `vault`   | `vault-create` | Vault readiness — the reserved seat for the account/vault-creation step | **confirmation only** ("your vault is ready on this device"); no implied crypto action (BR-4) | real key creation + passphrase → AR-3/UX-5b/M3 |
| 4   | `ready`   | `complete`     | Confirm + set marker + hand off to Home `/`                             | render + mark                                                                                 | —                                              |

> **Step 3 honesty (critique finding).** In M1.0 the `vault` step performs no action (there is no key to create),
> so its copy MUST be a **confirmation** ("your local vault is ready"), never "Create your vault" — the latter
> implies an action that did not occur (a BR-4 violation on its own step). The step stays present in the model
> (`deferredImpl: 'vault-key'`) so the step index is stable for UX-5b/M3; only its M1.0 copy is confirmation-shaped.

- **Linearity:** forward via "Continue"/"Get started"; a Back affordance may return to the previous step (no skip
  past `vault`). The model encodes order; UI-4 renders the controls.
- **Placement (OQ-3 resolved):** a **boot-phase branch in `App.tsx`**, after `dbReady`, **before** the router —
  first-run is not a navigable route (no deep-link, no history entry). The design specifies the branch point as a
  contract; UI-4 wires it. (Rejected: a `/onboarding` route — it would be linkable/bookmarkable and pollute history
  for a one-time gate.)

### §3.2 The first-run boundary contract

- **Signal:** `app_state['first_run:completed']`. Pure predicate `isFirstRun(flag: string | undefined): boolean`
  = `flag !== '1'`.
- **Two-signal independence (critique finding — the one soundness hole).** `WorkerDbClient.exists('vida')`
  `[FACT: apps/web/src/db/client.ts:120]` is the **DB-lifecycle** signal (boot uses it to decide open-vs-create) and
  is **NOT** the onboarding trigger. On the very first launch, `open()` migrates the DB before `App.tsx` reaches the
  `dbReady` branch, so `exists()` is already `true` while `onboarding_completed` is still unset — they disagree on
  first run **by design**. The onboarding branch keys **only** on `isFirstRun(app_state['onboarding_completed'])`.
  UI-4 must not wire the branch to `exists()` (it would make onboarding never show).
- **Branch point:** `App.tsx`, in the `dbReady === true` branch, before `<RouterProvider>`. The design names this
  as the seam; **no code change to `App.tsx` in this unit** (UI-4 implements it).
- **Completion:** on step 4, write `app_state['onboarding_completed'] = '1'` (a `Repository`/`run` write — impl by
  UI-4), then render the app at `/`.

### §3.3 A11y + responsive (design rules for UI-4)

- **Focus:** each step transition = `FOCUS_CONTRACT.pageNav` → move focus to the step's `<h1>`/main heading. The
  primary action is reachable by Tab; Enter/Space activates (UX-4 keyboard model).
- **No Escape-dismiss** (BR-1). No focus escape to the (not-yet-rendered) app behind — onboarding owns the viewport.
- **Responsive:** full-viewport takeover. Mobile (375) = single-column full-bleed; tablet/desktop (768/1440) =
  centered content column within `CONTENT_MAX_WIDTH` (1280); `wide` (1920) caps containment
  `[FACT: apps/web/src/shell/breakpoints.ts:26,29]`. Screens are UI-4's render; the model only fixes the responsive intent.
- **Reduced motion:** any step transition respects `prefers-reduced-motion` (DS-3 motion tokens; UI-4 applies).

### §3.4 The ZK / local-first content contract (BR-4)

Per state, what the copy MAY assert (design contract, not final prose):

- `welcome`/`vault` steps, **M1.0**: `vault` copy is a **confirmation** of local readiness, never a "create"
  action (§3.1 step-3 honesty note) — no implied crypto action.
- `privacy` step, **M1.0**: "Vida is local-first — your data lives on this device." MAY note encryption is
  "coming as the platform hardens" but MUST NOT claim data is currently encrypted-at-rest or zero-knowledge.
- `privacy` step, **M3+ (AR-3 live)**: the full claim — "encrypted on your device; it never leaves in plaintext;
  only you hold the keys." Gated behind an encryption-active signal (a seam the model reserves; UX-5b/M3 flips it).

### §3.5 Deferred-seam register

| Seam                                        | M1.0 posture                        | Owner             |
| ------------------------------------------- | ----------------------------------- | ----------------- |
| Vault-key creation (Argon2id / Account Key) | no-op; vault = open local DB        | AR-3 / M3         |
| Passphrase capture                          | none/trivial `[ADR-017:22]`         | AR-3 / UX-5b / M3 |
| Unlock-on-every-launch UX                   | absent (auth off)                   | UX-5b / M3        |
| Full ZK-crypto copy                         | replaced by local-first copy (BR-4) | UX-5b / M3        |
| Per-name / multi-vault first-run            | single vault `'vida'`               | AR-4 / auth       |

---

## §4. Acceptance

- [ ] **A1** The flow is fully specified as an ordered 4-step model (id · kind · intent · M1.0 impl · deferred), each with focus + terminal-state behavior.
- [ ] **A2** The first-run boundary is specified against the real boot path: signal = `app_state['first_run:completed']`, predicate `isFirstRun`, branch point in `App.tsx` (design-only, no edit), completion write defined — **and** `exists()` is explicitly stated as NOT the onboarding trigger (two-signal independence, §3.2).
- [ ] **A3** Every crypto/auth element is in the deferred-seam register with an owner; no step presumes a vault key (BR-3).
- [ ] **A4** The copy-honesty contract (BR-4) is defined per state; M1.0 = local-first only, full ZK gated to AR-3/M3.
- [ ] **A5** Reuses UX-4 `FOCUS_CONTRACT` and UX-3 breakpoints; redefines none. `OVERLAY_DISMISS` is out of scope by category (onboarding is a boot-phase surface, not an overlay), with no-Escape stated explicitly for UI-4 (BR-1).
- [ ] **A6** Declarative artifact (`apps/web/src/onboarding/*.ts`, **no barrel** — import specific files per STANDARDS §XX) typechecks + is unit-tested: `isFirstRun` truth table; step-model integrity (order, unique ids, valid kinds); `complete` is terminal AND any step with `deferredImpl` is non-terminal. `@vida/web` green; no rendered surface, no Visual Gate.
- [ ] **A7** `docs/core/architecture/onboarding.md` created (+ README row); consumption by UI-4 + UX-5b stated.
- [ ] **A8** §XXIX currency: touched contexts' `current-*` refreshed (or marked current).

---

## §5. Implementation prompt (files)

1. **`apps/web/src/onboarding/steps.ts`** — the step model as typed data:
   - `OnboardingStepKind = 'intro' | 'explain' | 'vault-create' | 'complete'`
   - `interface OnboardingStep { id: string; kind: OnboardingStepKind; deferredImpl?: 'vault-key' | 'passphrase' }`
   - `ONBOARDING_STEPS: readonly OnboardingStep[]` (the 4 steps, in order)
   - Copy-contract constants per §3.4 (what each state may assert) — as data, not prose.
2. **`apps/web/src/onboarding/first-run.ts`** — the boundary contract:
   - `ONBOARDING_COMPLETE_KEY = 'onboarding_completed'` (the reserved `app_state` key)
   - `ONBOARDING_COMPLETE_VALUE = '1'`
   - pure `isFirstRun(flag: string | undefined): boolean`
   - a typed `FIRST_RUN_BRANCH` descriptor documenting the `App.tsx` seam (where/when) as data (for UI-4).
3. **`apps/web/src/onboarding/*.test.ts`** — `isFirstRun` truth table; step-model integrity (order, unique ids, valid kinds, `complete` terminal, `deferredImpl` steps non-terminal).
4. **`apps/web/src/onboarding/CLAUDE.md`** — layer doc (matches `nav`/`shell`/`state-conventions` siblings).
   **No `index.ts` barrel** — import specific files directly, per the sibling layers + STANDARDS §XX (`state-conventions/CLAUDE.md`: "No barrel — import specific files").
5. **`docs/core/architecture/onboarding.md`** (+ README row) — the flow model, boundary contract, copy-honesty contract, deferred-seam register, a11y/responsive rules, consumption by UI-4 / UX-5b.
6. **§XXIX** — refresh the `apps/web` context `current-*` docs if present; else mark current.

**Out of scope:** rendered screens (UI-4); real vault/passphrase (AR-3/UX-5b); editing `App.tsx`/`routes.tsx`.
