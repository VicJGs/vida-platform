---
Session 2 — 2026-10-06
Goal: fe-codec-primitives-refinement (LIF-230) — P2 Card (CODEC aesthetic + alive-hooks + P1-gate landmark fix)
Profile: Change Frontend Component · Scenario: default (Entity Delivery Flow ②)
Branch/worktree: fe-codec-primitives-p2-card @ .claude/worktrees/fe-codec-primitives-refinement (off origin/main)
---

## Accomplished
- **P2 Card SHIPPED → PR #96 (OPEN, mergeable).** `@vida/ui` Card brought to the CODEC model:
  - **Landmark fix (BR-C-11 / DEF-U5-g):** `header`/`footer` → plain `<div>`s (drop `render:'header'/'footer'`) — 0 duplicate `banner`/`contentinfo` in a repeated list row (the P1-gate flag resolved).
  - **Alive-hooks** (additive, optional, `neutral`/absent = prior render): `status` (calm/warm `StatusEdge` accent · faded = recessed+flat) · `metric` (ring slot) · `headerDivider`.
  - **BR-C-5** 2-layer `shadow.resting` token (Card sole consumer); dark self-cancel preserved.
  - **DEF-U5-h** pre-existing bug fix: Card `padding` variant never applied (0px on every card) — variant name collided with Tamagui's built-in `padding` prop; renamed `padding`→`pad`, public prop unchanged.
- **Full §XXVI double-gate** (spec Approval 1 → preflight → Approval 2) + blocking **Visual Gate** + independent code-review (2 BLOCKERs folded) + pre-ship `/critique` SHIP.
- **Gates:** tsc 0 · eslint 0 errors · **@vida/ui 420/420** (Node 24) · **Visual Gate PASS** (Brave, 24 cells: 3 presets × light/dark × calm/dense + landmark + editorial — AA worst 4.52 incl. warm-dark & the composited faded card · axe 0 · 0 landmarks · edges emerald/red preset-invariant).
- **§XXIX currency:** `packages/ui/src/CLAUDE.md` + `card.md` (DEF-U5-g/h Addendum) + `u5-card.md` P2 addendum.

## Decisions Made
- **Landmark fix = drop the tags (Option B), not frame→`<article>`** — grounded reversal: `card.md:6` Intent governs the `:45` mechanism; `card.md:21`/`u5-card.md:82` fix the ref to a `<div>` (Option A violated both). A descoped `<header>` has no AT value.
- **`faded` dims the chrome, holds the text** (BR-C-7a) — blanket `opacity:0.62` composites over the page → muted text ~2.4 (Visual-Gate composited probe + axe caught it). Faded = recessed surface + flat, text full-opacity → AA baseline.
- **Status edge = absolute child** (not `borderLeftWidth`, no frame `overflow:hidden`) per toast.tsx + the raised-shadow constraint.
- **Soft elevation via the token** (Card-only blast radius), not a card-styles literal.
- **Visual Gate must assert measurement + composite opacity** — the first gate false-greened (empty arrays).

## Open Questions
- none blocking. (Pre-existing M4 follow-up unchanged: danger `#ef4444`=3.63 text-AA fail → Figma M4/P2; the status edge is a 3:1 graphical object, unaffected.)

## Next Session
First step: **P3 · Timeline** — the now-fulcrum variant (past=record / future=intention) + accent "now" dot + serif/eyebrow dates + lighter rail. Fresh `/begin` in the SAME worktree (`fe-codec-primitives-p2-card` — or branch a new `-p3` off main). Per-phase spine: `/document-context` baseline → spec `/documentation-component` (+`/contract` for the Layer-2 now-fulcrum variant) → Approval 1 → preflight → Approval 2 → implement → Visual Gate → `/critique` + review → §XXIX → PR.
Context to reload: `.claude/tasks/fe-codec-primitives-refinement.md` (## Build Steps + Phase log), `docs/specs/foundation/fe-codec-primitives-refinement/mockups/views-refinement.html` + `views-alive-concept.html` (Timeline plates), `packages/ui/src/components/timeline.tsx`, `packages/ui/src/CLAUDE.md` (Card P2 currency). Env: Node 24 for @vida/ui tests; Visual Gate = Brave via `/tmp/vg` on SB :6099.
