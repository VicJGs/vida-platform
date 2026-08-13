# Spec: bug:ui-3-ui-4-ordering-reconcile
Status: RESOLVED   <!-- 2026-08-13: UI-3-first CONFIRMED (UI-3 E1–E4 building); part-3:116 clarified as non-ordering -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-09-ui-2-platform-views (triage via /victor-triage) · 2026-08-11-ui-3-vida-editor (decided) · 2026-08-13-ui-3-e4-slash-menu (resolved + committed).

## 1. Identity
A documentation inconsistency in the UI-wave build order: **does UI-4 (app shell) come before UI-3 (editor)?**
Surfaced by Victor 2026-08-09. Classified **ISOLATED** — does NOT affect the current head (UI-2). This unit
exists so the UI-3-vs-UI-4 order is settled BEFORE either is picked up, not rediscovered then.

## 2. Findings (diagnosis)
**Symptom:** the session path stated "UI-1→UI-2→UI-3→UI-4" as settled; a doc line reads UI-4 before UI-3.

**Root cause (one sentence):** `part-3-build-roadmap/_index.md:116` is a **descriptive enumeration of the
"app boot" surface, not a build-order statement** — it happens to list UI-4 before UI-3; it is NOT a real
ordering/dependency conflict. [FACT: same line lists DS-1…5 *after* UI-4, yet DS-5 must precede UI-4
(UI-4 ← UI-1 ← DS-5) — so the line cannot be a build order.]

**Authoritative sources — unanimous: UI-3 before UI-4:**
- [FACT: roadmap.md:90] lists UI-3 before UI-4.
- [FACT: m1.0-delivery-plan.md:140] "UI-1→UI-2→UI-3→UI-4".
- [FACT: reconstructed-structure.md:86-87] UI-3 = `#29`, UI-4 = `#30` (the `#` global build order).

**Dependency edges — parallel-ready (neither blocks the other), so `#` tie-breaks → UI-3 first:**
- [FACT: reconstructed-structure.md:86] UI-3 ← UI-1, AR-4 · blocks CAP-authoring.
- [FACT: reconstructed-structure.md:87] UI-4 ← UI-1, UX-3 · leaf (blocks nothing).

**Dissent (low authority):** `part-3-build-roadmap:116` (non-ordering enumeration) + `_legacy/architecture.md:867`
(quarantined legacy).

## 3. Blast radius
- **Unaffected:** the current head. [FACT] UI-2 (`#28`) precedes both UI-3 and UI-4 in every source → UI-2
  proceeds regardless.
- **Affected:** the UI-3-vs-UI-4 sequencing decision, which only matters once UI-2 completes.

## 4. Decision — RESOLVED (UI-3 before UI-4)
- **RESOLVED (the "NO" branch):** keep **UI-3 before UI-4** — the unanimous authoritative order (§2). UI-3 was picked
  up and is building (E1–E4 shipped: `@vida/editor` v0.1.0→v0.4.0, PRs #15/#16/#17 merged, #18 open); "UI-4 before UI-3"
  was NOT Victor's intent. Residual action DONE: `part-3-build-roadmap/_index.md:116` clarified as an **unordered
  surface list, not a build sequence** (it now points here). No re-sequencing of roadmap:90 / delivery-plan:140 /
  reconstructed `#` order needed — they were already correct. `[FACT: docs/specs/features/ui-3-vida-editor/_index.md
  E1–E4; part-3 _index.md:116 clarified 2026-08-13]`

## 5. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-09 | ui-2-platform-views | triage diagnosis persisted (ISOLATED; head unaffected) |
| 2026-08-13 | ui-3-e4-slash-menu | **RESOLVED** — UI-3-first confirmed by the build (E1–E4 shipped); `part-3:116` clarified as non-ordering; §4 UNKNOWN closed (NO branch). |
