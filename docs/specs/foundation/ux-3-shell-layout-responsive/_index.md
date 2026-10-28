# Spec: feature:ux-3-shell-layout-responsive (UNIT INDEX — thin, session-split)

Status: implemented <!-- draft → plan-draft → approved → implemented -->
Result: design doc `docs/core/architecture/shell-layout.md` (+README row) + declarative layout artifact
`apps/web/src/shell/{breakpoints,regions}.ts` (+22 tests) + layer `CLAUDE.md`. Applies design.md §X/§IV/§V (invents
no values); the region reflow model is UX-3's own design. typecheck 0 · @vida/web 66/66 (22 new) · lint 0-err · root
10/10. Gates: Approval 1 (critique SHIP, 2 drift-catches corrected) + preflight PASSED (F1) + Approval 2 (gate-2 SHIP)

- post-impl audit SHIP. **NOT committed** (on `main`, clean — branch+PR at Victor's go).
  Source-repo: /Users/victor/Documents/CODE/vida-platform
  No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
  Class: **design/spec issue (dep-graph), same class as UX-1/UX-2** → **FULL** §XXVI gate. `[baseline §5]` It designs
  the shell layout + responsive model over unbuilt seams (UI-4 chrome, `@vida/ui` not-yet-wired, Spaces M1.1); likely
  emits a declarative `apps/web/src` layout artifact (the UX-1 `module-map.ts` / UX-2 `command-bar/` precedent), NOT a
  rendered component. PLAN confirms artifact-vs-pure-doc (both FULL).
  Baseline (§XXVI.1a ground truth): [`baseline.md`](./baseline.md) — ✅ authored 2026-08-09.

## 1. Identity

UX-3 (LIF-92, `#23`) — the Vida web app's **shell layout + responsive model**: the daily-driver frame — how the
nav dock / Spaces-bar seam / global bar / content / ⌘K-modal overlay host compose, how each region reflows across
widths, and the density that makes it livable all day. Defined here; **physically implemented as app-shell
components in UI-4** (LIF-89) later.

**What it is (INTENT)** `[FACT: ia.md:153; task goal]`: the _layout + responsive model_ of the reserved shell
regions — region composition, the breakpoint set, per-region reflow, density, layering, and the state the shell
store must reserve. The spec UI-4 renders.

**What it is NOT** `[INTERP: from sibling UX-1/UX-2 "What it is NOT" + reconstructed:80]`: not the shell
_components_ that render it — dock/sidebar/top-bar/command-bar/modal host (UI-4) · not the command-bar + search
_interaction_ (UX-2 — UX-3 owns only its _placement/geometry_) · not the nav/module data (UX-1's `module-map.ts`) ·
not the Spaces-bar _content_ (Spaces module, M1.1 — UX-3 reserves the region only) · not wiring `@vida/ui`/
`UIProvider` into apps/web (UI-4's seam) · not client-state _conventions_ (UX-4) · not the native mobile shell
(@vida/mobile, its own track — UX-3 = web responsive only) · not onboarding (UX-5).

## 2–3. Business Rules & Contract

Live in the active session's PLAN gate file (session-split; not duplicated here). Authored via
`/documentation-component` at the PLAN step.

## 4. Acceptance

See the PLAN's §4 (functional acceptance). Promoted to its durable home (`docs/core/architecture/shell-layout.md`

- the artifact's CURRENT- docs) on completion (Currency Rule §XXIX).

## 5. Implementation Prompt

Authored after Approval 1 (gate 2, FULL variant — the `apps/web/src/shell` artifact is code). Empty until confirmed.

## 6. Open UNKNOWNs / Decisions Needed — **NONE remain** (all resolved by docs/precedent)

Two drift-catches (Victor) closed every apparent decision:

- D1 breakpoints + D3 density/containers → **design.md §X/§IV** (applied, not decided).
- D2 doc+artifact + D5 app-local home → the **UX-1/UX-2 deliverable pattern + the issue's `apps/web/src`-only Home**
  (`packages/ui` deliberately excluded vs UX-4) — not forks.
- D4 overlay placement-only → the **IA scope boundary** (UX-3 layout / UX-2 interaction / UI-4 render).
- [confirm at IMPL-PLAN only] tablet dock = rail (design detail within the standard's frame).
  Profile corrected `Generic`→**add-frontend-component (design-led)** (root cause of drift-catch 1).

## 7. Change Log

| Date       | Session                                 | Change                                                             |
| ---------- | --------------------------------------- | ------------------------------------------------------------------ |
| 2026-08-09 | 2026-08-09-ux-3-shell-layout-responsive | stub → thin index; baseline + PLAN authored (document-first §XXVI) |
