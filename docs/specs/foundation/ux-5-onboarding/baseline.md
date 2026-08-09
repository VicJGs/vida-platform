# UX-5 — First-Run Onboarding · Baseline + Feature Brief

**Issue:** UX-5 (LIF-94) · M1 / M1.0 — Boot & Connective Base · `#25`
**Profile:** new-feature / Default · **Authority:** ADR-019 (auth-coupled → deferred split), ADR-017 (features-first)
**Deliverable class:** design MODEL (doc + declarative artifact under `apps/web/src`) — **no rendered component, no Visual Gate at this unit** (screen render deferred to UI-4, per `frontend-visual-gate.md` render table). Same shape as UX-3 / UX-4.

Grounded per the No-Guessing Principle. Every claim is `[FACT: path:line]` or flagged `[UNKNOWN]`.

---

## 0. What this unit is

Design the **basic first-run onboarding flow** for the Vida web app: the first-launch experience, the
zero-knowledge expectation-setting, and the account/vault-creation *intent*. The "front door."

The deliverable is the **design model** — a durable architecture doc + a declarative artifact UI-4 implements —
**not** a rendered screen. This mirrors the UX-track precedent: UX-1 reserved the nav model
(`nav/module-map.ts` + IA doc), UX-3 the shell model (`shell/{breakpoints,regions}.ts` + shell-layout doc),
UX-4 the state conventions (`state-conventions/*.ts` + doc); UI-4 renders all of them.

---

## 1. The M1.0 boundary — what is designed NOW vs a deferred seam

This is the crux of the unit, and the docs fix it (not discretion):

- **`[FACT: ADR-017:22]` Auth is OFF for the feature phase** — "no SRP/vault-unlock for the feature phase — **a
  trivial local passphrase or none**." The encryption/auth layers are **deferred, not dropped**; their seams
  already exist `[FACT: ADR-017:12,32]`.
- **`[FACT: .claude/tasks/ux-5b-vault-unlock.md]` The auth-coupled half is carved to UX-5b (LIF-101, M3)** —
  the unlock/lock-on-every-launch UX that couples to the AR-3 vault key. UX-5b is `blocked by ux-5 + ar-3`.
- **`[FACT: delivery-plan:212]` UX-5 = "Onboarding (basic first-run)"; profile new-feature; `impl UI-4`.**
- **`[FACT: ux-5-…onboarding.md:17-20]` AR-3 (crypto, M3) was removed as a blocker** — "an M1.0 design issue
  cannot be build-blocked by M3 impl."

**Therefore the split is:**

| Designed NOW (UX-5, M1.0) | Deferred seam (marked in the design, built later) |
|---|---|
| First-launch welcome / value-prop screen | — |
| Zero-knowledge explanation (expectation-setting) | — |
| First-run **detection + branch** (boot: first-run → onboarding; else → app) | Per-name/multi-vault first-run semantics → AR-4/auth `[FACT: web-adapter.ts:74-78]` |
| Account/vault **creation step** — designed as a flow step; M1.0 impl = **trivial passphrase or none** `[FACT: ADR-017:22]` | Real vault-key creation (Argon2id/Account-Key) → **AR-3/M3** |
| "Onboarding complete" marker + hand-off to Home (`/`) | — |
| Unlock-on-every-launch UX | **UX-5b / M3** (needs the vault key) |

---

## 2. Existing surfaces UX-5 attaches to (cited map)

### Boot / entry
- `[FACT: apps/web/src/main.tsx:5-8]` `createRoot(...).render(<StrictMode><App/></StrictMode>)` — no provider wrap here.
- `[FACT: apps/web/src/App.tsx]` `App()` is the **boot gate**: `useEffect → ensureDbReady()`; renders (a) error+Retry
  on `dbError`, (b) "Loading…" splash while `!dbReady`, (c) `QueryClientProvider ⊃ RouterProvider` once `dbReady`.
  **No first-run branch exists here yet** — this is the natural attachment point.
- `[FACT: apps/web/src/routes.tsx:21-35]` `createRootRoute` → `RootComponent` renders a **minimal AR-4 scaffold**
  (`<nav>` + `<Outlet/>`), explicitly "the real app layout/IA is UX-3 / UI-4, out of AR-4 scope." `indexRoute` `/`
  → `<h2>Vida</h2>`.

### First-run detection (the boundary API)
- `[FACT: apps/web/src/db/client.ts:120-124]` `WorkerDbClient.exists(dbName): Promise<boolean>` — the first-run
  detection API. `[FACT: apps/web/src/db/web-adapter.ts:79-82]` returns `(vfs?.getSize() ?? 0) > 0` — whether the
  OPFS pool holds any persisted DB. M1.0 = single hardcoded vault `'vida'` `[FACT: db/boot.ts:13]`; per-name
  semantics deferred `[FACT: web-adapter.ts:74-78]`.
- `[FACT: db/worker.ts:21-24]` `open(dbName)` migrates inside open (bootstraps `app_state` via DB-7 `ensureInfra`
  + runs migrations). So "DB exists" ≈ "has been booted before."
- **`[UNKNOWN]` where the onboarding-complete flag lives.** Candidates: `user_profile` (Explore suggested) or
  `app_state` (the local-only KV that already bootstraps). To be resolved in the PLAN against the real schema —
  do not assume.

### Reused conventions (do not redefine)
- `[FACT: nav/module-map.ts:56-59,114-121]` `NAV_AXES`, `MODULE_MAP`, `GLOBAL_SURFACES`. Onboarding is **not** a
  module and **not** a global surface (it is time-bound to first-run) — it is a top-level non-nav route.
- `[FACT: shell/regions.ts]` 5 regions incl. `overlayHost` (`OVERLAY_MODE`: sheet on mobile / centered tablet+,
  z `$overlay` 1200). Onboarding either replaces the shell during first-run or lives in `overlayHost`.
- `[FACT: shell/breakpoints.ts]` `PRIMARY_TEST_WIDTHS = [375,768,1440]`; onboarding respects the same responsive model.
- `[FACT: state-conventions/keyboard.ts]` `FOCUS_CONTRACT` (overlayOpen→first-focusable, overlayClose→trigger,
  pageNav→main-heading) + `OVERLAY_DISMISS` (Escape). A stepped onboarding **reuses these verbatim**.
- `[FACT: state-conventions/terminal-state.ts]` `deriveTerminalState<T>` — reused only if an onboarding step has a
  loading/error phase.

### Durable docs
- `[FACT: docs/core/architecture/]` has README + information-architecture / shell-layout / state-conventions /
  command-bar-and-search / system-overview. **No onboarding doc yet** — UX-5 creates
  `docs/core/architecture/onboarding.md` (+ README row).

---

## 3. Feature brief — intent + acceptance

**Intent.** Design the first-run onboarding as a durable model UI-4 can implement: the ordered set of steps
(welcome → ZK-explanation → vault/account creation → complete), the first-run detection + branch contract at boot,
the completion marker, and the a11y/responsive behavior — with the crypto-coupled parts marked as deferred seams
(AR-3 / UX-5b / M3), auth-off in M1.0 per ADR-017.

**Proposed deliverables (to be confirmed in the PLAN gate):**
1. `docs/core/architecture/onboarding.md` (+ README row) — the flow model: steps, the first-run boundary, the
   ZK-explanation content contract, the deferred-seam register, a11y/responsive rules, consumption by UI-4/UX-5b.
2. `apps/web/src/onboarding/*.ts` — a **declarative** artifact (onboarding step model + the first-run boundary
   contract as typed data/pure logic), tests included. No rendered component. *(Exact file split decided in PLAN.)*

**Acceptance (draft — refined in PLAN §4):**
- [ ] The onboarding flow is fully specified as an ordered step model, each step with intent + terminal states + focus behavior.
- [ ] The first-run detection + branch is specified against the real boot path (`App.tsx` / `exists()`), with the completion-marker home resolved against the actual schema (no assumption).
- [ ] Every crypto/auth-coupled element is marked a deferred seam with its owner (AR-3 / UX-5b / M3) — nothing designed here presumes a vault key exists.
- [ ] The ZK-explanation content contract is defined (what expectation it sets; plain-language, not a wall of text).
- [ ] Reuses UX-4 `FOCUS_CONTRACT` / `OVERLAY_DISMISS` and UX-3 breakpoints/regions — redefines none of them.
- [ ] Declarative artifact typechecks + is unit-tested; `@vida/web` green; no rendered surface, no Visual Gate (deferred to UI-4).
- [ ] §XXIX currency: touched contexts' `current-*` docs refreshed.

**Out of scope (explicit):** the rendered onboarding screens (UI-4); the real vault-key creation + unlock/lock UX
(AR-3 / UX-5b, M3); per-name/multi-vault first-run semantics (AR-4/auth); the `user_profile`/preferences tables
if not already present (their owners).

---

## 4. Open questions for the PLAN gate
- **OQ-1** Completion-marker home: `app_state` (local KV, already bootstrapped) vs `user_profile` vs a new column?
  Resolve against the real schema; prefer reusing `app_state` if it fits (no new table for a boolean).
- **OQ-2** Does M1.0 include a passphrase step at all, or "none" per ADR-017:22? Design the step as present-but-
  optional/deferred, or omit it in M1.0 and add it at UX-5b? (Leaning: design the step in the model, mark impl deferred.)
- **OQ-3** Onboarding placement: dedicated `/onboarding` route vs a boot-phase overlay before the router. Decide in PLAN
  against `App.tsx`'s gate structure.
