---
Session 4 — 2026-10-07
Goal: fe-codec-primitives-refinement (LIF-230) — P5 Calendar (the FINAL phase), then close out LIF-230
Profile: change-frontend-component · Scenario: default (Entity Delivery Flow ②)
---

## Accomplished
- **P5 · calendar-view (PR #101, merged)** — the editorial Layer-1 refinement of the month-grid renderer, the LAST
  primitives-refinement phase. **Chrome only, no interface/behavior change**; hard invariants (TZ-safe `YYYY-MM-DD`
  keying, fixed 42-cell grid, `role="table"`/`cell` + per-cell `aria-label`, controlled-month/opt-in-nav) untouched.
  - serif `$heading`/500/`-0.3` **month title** · **weekday eyebrows** via CSS `textTransform` (DOM stays "Mon" —
    SR-correct `columnheader`; raw `letterSpacing:0.8` house value, NOT the near-invisible `$wide:0.02` token, left-set) ·
    day number `$caption`→**`$small`** + **tabular** figures (outranks its chrome) · **today = accent number + a short
    accent underline** (`TodayMark`, keeps `vida-cal-today`), REPLACING the filled `TodayBadge` blob · **weekend +
    out-of-month = `$colorSurfaceSecondary` paper** via a `tone:{weekend,oos}` variant (oos>weekend; day-number colour
    differentiates — oos muted, weekend ink) · "+K more" eyebrow. Chip dot = the consumer's `renderItem` (LV-5), shown
    in the story.
  - **The Visual Gate earned its keep:** `$colorBrandPrimary` passed AA on paper everywhere (4.95–6.41), but on a
    weekend/oos `$colorSurfaceSecondary` **today** cell it fell to **4.39 (editorial/dark) + 4.44 (quietDesk/light) < 4.5**
    — caught only by rendering a `TodayOnWeekend` story across the full 3-preset × light/dark matrix. Fixed to
    **`$colorBrandEmphasis`** (accent600 light / accent300 dark — the higher-contrast brand step in BOTH modes; **no new
    palette**, the ramp's emphasis step as Button-primary uses) → re-gate PASS (today 5.93–8.89 on paper+secondary).
  - 21 tests (14 + 7 new — Tamagui atomic-class assertions for tone/colour + inline `fontVariantNumeric`) · tsc 0 ·
    eslint 0 · @vida/ui **437** green · independent code-review clean · §XXIX currency (CLAUDE.md + v4 change-log + P5 spec).
- **Closed out LIF-230** — all 5 views shipped (P1 List #88 · P2 Card #96 · P3 Timeline #97 · P4 Gallery #99 · P5
  Calendar #101); status → done, `_index` Active→prior, TASKS.md updated, Linear LIF-230 → Done. Graph conformance homed
  to #8; Calendar living/multi-range to `fe-calendar` #19.

## Decisions Made
- **weekend/oos paper = DOC-RESOLVED, not an Approval fork** — the mockup ledger (`calendar-refinement.html:150,152`,
  "`$colorSurfaceSecondary` family" + oos faint, "no new palette") already specifies both cells → the single secondary
  step, differentiated by day-number colour. I initially framed it as a genuine fork (2-step scale vs the mockup's 3
  hex tints) and AskUserQuestion'd it; Victor: "check the documentation and code to ground it properly" → the oracle
  settled it. **Lesson reinforced: [[dont-frame-a-doc-resolved-handling-as-a-decision-nor-over-correct]].**
- **today number = `$colorBrandEmphasis`** (not `brandPrimary`) — a Visual-Gate-driven, token-grounded fix for the
  accent-on-secondary AA shortfall; stays inside the brand ramp (no palette churn → M4 unaffected).
- **uppercase weekday = CSS `textTransform`, never `.toUpperCase()`** — the DOM `columnheader` name must stay "Mon" for
  screen readers; matches the house eyebrow mechanism (`list-view.tsx:105`/`timeline.tsx:113`).
- **eyebrow tracking = raw `letterSpacing:0.8`** — the `$wide:0.02` design-ratio token renders ~invisible as px; the
  shipped house eyebrows use a raw number.

## Open Questions
- none. LIF-230 complete.

## Next Session
First step: the next frontend head — `fe-codec-dashboard` #5 (G6 surface build, the lowest-# ready unit; dep
`fe-codec-patterns` ✅), OR the next `#`-order backend M1.1.2 module. Both via a fresh `/begin`.
Context to reload: `.claude/tasks/_index.md`, `TASKS.md` (frontend-track row), `packages/ui/src/CLAUDE.md`.
Env: Node 24 via nvm for Vite/Storybook/vitest; Visual Gate = Brave via executablePath + `python3 -m http.server 6099`
on `storybook-static`, gate scripts under `/tmp/vg/*-gate.mjs`.
