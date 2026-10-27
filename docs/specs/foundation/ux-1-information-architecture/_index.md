# Spec: feature:ux-1-information-architecture (UNIT INDEX — thin, session-split)

Status: implemented <!-- draft → plan-draft → approved → implemented -->
Result: 4 files — docs/core/architecture/information-architecture.md · apps/web/src/nav/{module-map.ts,CLAUDE.md} · README row. typecheck 0, lint 0-err. Approval 1+2 ✅ (2026-08-01/02).
Source-repo: /Users/victor/Documents/CODE/vida-platform
Class: **design/spec issue** (dep-graph) that emits a declarative code artifact (dual home, reconstructed:72) → **FULL** §XXVI gate.
Baseline (§XXVI.1a ground truth): [`baseline.md`](./baseline.md)

## 1. Identity

UX-1 (LIF-90) — the Vida web app's **information architecture + navigation model**: the canonical top-level
navigation map (over the module inventory), the navigation model (dock metaphor + how Spaces/Views/preferences
layer over the fixed module map), and the route-hierarchy DESIGN that per-module routes slot into (M1.1+).
The **experience-track root** — UX-2/UX-3/UX-4/UX-5 build on it.

**What it is NOT** `[FACT: baseline §7]`: not the shell layout/responsive (UX-3) · not the shell components —
nav/sidebar/top-bar/command-bar/modal host (UI-4) · not command-bar+search UX (UX-2) · not client-state
conventions (UX-4) · not onboarding (UX-5) · not per-module route registration (each module's M1.1+ wave) ·
not building the `nav_preferences` table or the Spaces UI (Preferences/Spaces, M1.1).

## 2–3. Business Rules & Contract

Live in the active session's PLAN gate file (not duplicated here — session-split R3).

## 4. Acceptance

See the PLAN's §4 (functional acceptance). Promoted to `docs/core/architecture/` on completion (Currency Rule §XXIX).

## Active session gate files

- **Gate 1 (PLAN / direction):** [`sessions/PLAN-2026-08-01-ux-1-information-architecture.md`](./sessions/PLAN-2026-08-01-ux-1-information-architecture.md) — Rev 2 (post-critique)
- **Gate 2 (IMPLEMENTATION-PLAN):** authored after Approval 1 (FULL variant — the `apps/web/src` map artifact is code).

## Change Log

| Date       | Session                                  | Change                                                  |
| ---------- | ---------------------------------------- | ------------------------------------------------------- |
| 2026-08-01 | 2026-08-01-ux-1-information-architecture | stub → thin index; baseline + PLAN authored (LITE gate) |
