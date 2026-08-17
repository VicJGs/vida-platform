# Spec: feature:ui-4-app-shell-components
Status: draft            <!-- draft → approved → implemented -->
Source-repo: apps/web/src (+ packages/ui chrome where shared)
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-16-ui-4-app-shell-components (created this stub — §2–§6 authored later via the PLAN step)

<!--
  FORWARD spec — written BEFORE the shell is built. §1–§4 are the DESCRIPTION; §5 is the executable PROMPT
  that cites §1–§4. This is the STUB (Identity + homes); the real spec is authored by the loop's PLAN step
  (/documentation-component) after the Step-0 baseline. Governed by the No-Guessing Principle.
-->

## 1. Identity
The **web app-shell** — the persistent chrome every module screen renders inside: module dock / sidebar ·
global top-bar · command-bar host · content `<Outlet/>` · modal & overlay host. It COMPOSES the shipped
design models into concrete React components on UI-1 primitives:
- [FACT: reconstructed-structure.md:87] `#30 UI-4 · App shell components · home apps/web/src · ← UI-1, UX-3`.
- [FACT: m1.0-delivery-plan.md:140] `UI-4 · App shell (nav/sidebar/top-bar/command-bar/modal host) ·
  apps/web/src, packages/ui chrome · new-feature · ← UI-1, UX-3`.
- [FACT: delivery-plan:141] the `-c` UI wave's tile 4/4; `-d needs -c` → UI-4 releases the UX wave (UX-6).

**What it renders/wires** (models already shipped as typed artifacts + docs):
- [FACT] UX-3 shell layout → `apps/web/src/shell/{breakpoints,regions}.ts` (regions + responsive reflow).
- [FACT] UX-2 command bar → `apps/web/src/command-bar/*` (registry/providers/frecency/ui-store).
- [FACT] UX-5 first-run onboarding → `apps/web/src/onboarding/*` (`ONBOARDING_STEPS` + `FIRST_RUN_BRANCH`).
- [FACT] UX-1 nav model → `apps/web/src/nav/module-map.ts` (23 modules placed).

**What it is NOT** — [INTERP] not new primitives (UI-1 owns those) · not new platform views (UI-2 owns those) ·
not the Journal Home content (UX-6, gated behind this) · not auth/vault UI (M1.0 boundary: auth OFF, ADR-017:22;
vault-unlock → UX-5b/M3) · not the FTS5 search backend (DB-8 seam; command-bar search stays a guarded stub).

## 2. Business Rules (whole-issue invariants — each unit inherits + refines)
- [FACT: baseline §3.1] **BR-1 · Compose, don't rebuild.** Chrome is built in `apps/web/src` over UI-1 primitives +
  UI-2 views. The ONLY `packages/ui` write is adding a plain `media` object to `createTamagui` (the responsive
  breakpoints; shell-layout.md:149 — NOT a `createMedia` call, that v1 helper is gone in Tamagui v2). No new
  `@vida/ui` component (one consumer; rule-of-three unmet).
- [FACT: shell-layout.md:92-105 + tokens.ts:9] **BR-2 · No shell-invented values.** Every spacing/radius/z/motion
  value resolves to a DS token. Region z uses the existing scale (sticky 1100 · overlay 1200 · modal 1300 · toast
  1400); gutters from `SIDE_PADDING`; touch targets ≥44×44 at all widths.
- [FACT: shell-layout.md:60-75] **BR-3 · Responsive reflow is data-driven.** Every region reads its state from
  `regions.ts` predicates (`dockStateAt/overlayModeAt/isRegionVisibleAt/contentGutterAt`) + `useMedia()` — never a
  hard-coded width. Mobile-first; `wide` is max-width containment only.
- [FACT: state-conventions.md] **BR-4 · Degrade, never crash.** Every async/absent surface renders a terminal
  state via `deriveTerminalState` (loading/empty/error/success). Nav to an unbuilt route → the existing router
  `NotFoundComponent` (routes.tsx:21-24), never a blank/throw. Search with no index → the `search-unavailable`
  state (loud), not a blank list.
- [FACT: keyboard.ts + shell-layout.md:109-113] **BR-5 · Focus + motion contract.** Overlays honor `FOCUS_CONTRACT`
  (open→first-focusable, close→trigger) + `OVERLAY_DISMISS` (Esc). Onboarding pageNav→main heading; NO Esc-dismiss
  (mandatory gate). Motion animates transform/opacity only, DS-3 `moderate`, `prefers-reduced-motion`→instant.
- [FACT: onboarding.md:23-36 + ADR-017:22] **BR-6 · M1.0 boundary.** Auth OFF. Every crypto/auth element is a
  deferred seam (AR-3/UX-5b/M3); the vault step is confirmation-only copy (BR-4 copy-honesty, `m1` local-first only).
- [FACT: baseline §3-B-C] **BR-7 · Lazy-load heavy WebGL.** The `/graph` route (NeuralGraph → sigma/graphology) is
  `lazyRouteComponent`-split so it never enters the initial bundle.

## 3. Contract (the surface boundaries UI-4 renders — details per-unit)
Existing UI-1/UI-2/UX artifacts are REFERENCED, not redefined. UI-4 adds render components in `apps/web/src` +
extends `app-shell-ui-store` (`+isMobileNavOpen`, shell-layout.md:120) + injects the router into
`CommandRunContext.navigate`. Per-surface contracts (props, states, a11y) are authored in each unit's spec §3,
delegating to `/contract`. No new cross-package edge; the app→package boundary stays one-way (`apps/web` → `@vida/ui`).

## 4. Acceptance (whole-issue DoD — each unit adds its own §4)
- [ ] Shell renders all 5 regions per the `regions.ts`/`breakpoints.ts` model at 375/768/1440/1920 (BR-2,BR-3)
- [ ] Dock reflows drawer→rail→sidebar; global bar condensed→full; Spaces-bar seam reserved (BR-3)
- [ ] Command-bar overlay opens on ⌘K, renders command + `search-unavailable` states, router injected (BR-4,BR-5)
- [ ] First-run branch renders the 4 UX-5 screens + writes `first_run:completed='1'`; no Esc-dismiss (BR-6)
- [ ] `/graph` is lazy-split (not in the initial bundle) (BR-7)
- [ ] Every value is a DS token (no hex, no invented spacing/z) (BR-1,BR-2)
- [ ] `apps/web` green (typecheck · tests · lint) + each rendered unit clears the component Visual Gate
- [ ] Currency (§XXIX): `docs/core/architecture/*` refreshed for touched contexts; shell layer-doc written

## 5. Implementation roster — the units (DERIVED from the doc-enumerated surfaces, baseline §4-B-B)
UI-4 builds as sequential units, each off clean `main` through its own §XXVI double-gate + (rendered ones) the
component Visual Gate + own PR — the UI-1/UI-2/UI-3 per-unit discipline. Each unit's detailed §1–§5 spec is
authored at its turn (this file is the umbrella; the first unit's spec is a sibling file).

| Unit | Scope | Renders? → Visual Gate | Primary sources |
|------|-------|------------------------|-----------------|
| **S1 · Shell scaffold** | the 5-region frame (mounted in `routes.tsx` `RootComponent` wrapping `<Outlet/>`) + `UIProvider`/`ToastProvider` at root (App.tsx) + `media` config (D5) + `app-shell-ui-store` extension (`isMobileNavOpen`) | ✅ | shell-layout.md · regions.ts · breakpoints.ts · provider.tsx · routes.tsx |
| **S2 · Nav chrome** | module dock + global bar + Spaces-bar seam; responsive drawer→rail→sidebar; renders `MODULE_MAP`/`GLOBAL_SURFACES` | ✅ | IA.md · module-map.ts · regions.ts |
| **S3 · Command-bar overlay** ✅ SHIPPED | ⌘K launcher (input + command list + result list + `search-unavailable`) + router injection + trigger. Composes UI-1 Dialog+Input; combobox/listbox; lenient ⌘/Ctrl+K. Spec `./s3-command-bar-overlay.md`. | ✅ | command-bar-and-search.md · command-bar/* |
| **S4 · Onboarding** ✅ SHIPPED | the 4 first-run screens + `App.tsx` `FIRST_RUN_BRANCH` wiring + completion write. `useFirstRun` 3-state boot resolution · marker repo (`INSERT OR REPLACE`) · confirmation-only vault · write-then-flip. Renders OUTSIDE AppShell. Spec `./s4-onboarding.md`. | ✅ | onboarding.md · onboarding/* |
| **S5 · Integration** | compose S1–S4 in `App.tsx`/routes · `/graph` lazy-split · whole-shell manual regression · Currency + layer-doc | integration (no new render) | routes.tsx · all above |

S1 is the head (everything mounts inside it). Its detailed spec: `./s1-shell-scaffold.md`.

## 6. Open UNKNOWNs / Decisions Needed
- None. Every gap the task raised is resolved by the documentation (baseline §3 + §4). This spec cites the
  governing sources; it introduces no fork.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components | initial stub (Identity + homes) |
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components | umbrella authored — §2 BR-1..7, §3 boundaries, §4 whole-issue DoD, §5 S1–S5 roster (doc-derived), §6 none. Per Step-0 baseline. |
| 2026-08-17 | 2026-08-16-ui-4-app-shell-components-4 | **S3 (command-bar overlay) SHIPPED** — composes UI-1 Dialog+Input, combobox/listbox, ⌘K keydown (lenient ⌘/Ctrl), router injection, `search-unavailable` states; zero `packages/ui` edit (BR-1). §XXVI double-gate (gate-1 REVISE 2 blockers+4 material folded · preflight PASSED 3 folds · gate-2 SHIP) + Visual Gate SHIP (caught a real ⌘K-dead-on-Mac bug → lenient mod match). Green: web typecheck · 139 tests · lint0 · build. Remaining: S4 (onboarding) · S5 (integration). |
