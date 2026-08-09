# Spec: feature:ux-2-command-bar-search   (UNIT INDEX — thin, session-split)
Status: implemented            <!-- draft → plan-draft → approved → implemented -->
Result: design doc `docs/core/architecture/command-bar-and-search.md` (+README row) + contract artifact
`apps/web/src/command-bar/{types,nav-commands,frecency,search-provider,registry}.ts` + `stores/command-bar-ui-store.ts`
(+5 tests) + layer `CLAUDE.md`. typecheck 0 · lint 0-err · @vida/web 44/44 (23 new) · zero unbuilt-system imports ·
engineering gate PASS. Gates: Approval 1 (critique REVISE→fixed) + preflight PASSED + Approval 2 (gate-2 SHIP). NOT committed.
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Class: **design/spec issue (dep-graph), same class as UX-1** → **FULL** §XXVI gate. `[baseline §3]` It designs
an interaction model over three unbuilt seams; likely emits a declarative `apps/web/src` command/action registry
(the UX-1 `module-map.ts` precedent), NOT a rendered component. PLAN confirms artifact-vs-pure-doc (both FULL).
Baseline (§XXVI.1a ground truth): [`baseline.md`](./baseline.md) — ✅ authored 2026-08-09.

## 1. Identity
UX-2 (LIF-91, `#22`) — the Vida web app's **command bar + global search interaction model**: the
keyboard-first launcher (⌘K-style, `command_bar_history`-backed) and the **search-as-you-type UX** over the
FTS5 substrate, defined over the UX-1 navigation model. The keyboard-first way to jump anywhere in the app.

**What it is (INTENT)** `[FACT: task goal]`: the *interaction model* — command palette behavior, search
ranking/preview UX, keyboard grammar, recency/history semantics. Defined here; **physically implemented as
shell components in UI-4** later.

**What it is NOT** `[INTERP: from sibling UX-1 "What it is NOT" + reconstructed:79]`: not the shell
layout/responsive (UX-3) · not the shell components that render it — command-bar host, modal host (UI-4) ·
not building the FTS5 tables / search population (DB-8, M1.4) · not the `command_bar_history` table itself
(Preferences module, M1.1) · not client-state conventions (UX-4). UX-2 designs the *seam* to those; it does
not build them.

## 2–3. Business Rules & Contract
Live in the active session's PLAN gate file (not duplicated here — session-split). Authored via
`/documentation-component` at the PLAN step.

## 4. Acceptance
See the PLAN's §4 (functional acceptance). Promoted to its durable home (`docs/core/architecture/` or the
code artifact's CURRENT- docs) on completion (Currency Rule §XXIX).

## 5. Implementation Prompt
Authored after Approval 1 (gate 2). Empty until the PLAN §5 is confirmed.

## 6. Open UNKNOWNs / Decisions Needed
- [UNKNOWN: needs baseline] Does UX-2 emit a code artifact in `apps/web/src` (like UX-1's `module-map.ts`),
  or is it a pure architecture-doc? → sets FULL vs LITE gate.
- [UNKNOWN: needs baseline] FTS5 (DB-8) is unbuilt until M1.4 — how far does UX-2 specify the search seam
  vs defer to DB-8? Guard the gap; do not design against a non-existent API.
- [UNKNOWN: needs baseline] `command_bar_history` schema — does it exist yet (Preferences, M1.1 unbuilt)?

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-09 | 2026-08-09-ux-2-command-bar-search | stub → thin index; baseline + PLAN next (document-first §XXVI) |
