# Fix: entity-view-header — title-hero vertical rhythm

**Unit:** `fix-entity-view-header` (unfiled; LIF on `--sync`) · **Profile:** Change Frontend Component · §XXVI-gated
**Component:** `packages/ui/src/components/entity-view.tsx` (`EntityView`, #6 / LIF-209, shipped)
**Source:** 2026-10-07 flow-session Envision review — `EntityView` is the canonical title-hero *source*; building
`flow-session-view` mirrored it and surfaced the missing gap. Victor's call: separate §XXVI unit.

## §0 — Ground truth (authority)
- **EC-5** (`docs/specs/foundation/fe-codec-flow-session/delivery/envision.md:53`): *"title-hero: the serif `$display`
  title carries **alone** + ONE quiet plain-language context line + a `HonestProgress` bar for progress (NOT a text
  subtitle)… **NO all-caps eyebrow, NO middle-dot meta-string** (mirrors `EntityView`; precision 1)."*
- **envision.md:5-6**: the pattern *"dropped the all-caps eyebrow + middle-dot meta-string"*; **"review-2 fixed the
  title→context breathing room (16px, 4pt grid)"** → the final value is **`$16`** (the draft `$12` was superseded).
- **Precedent (shipped):** `flow-session-view.tsx:97` — `TitleGroup = styled(View, { flexShrink: 1, gap: '$16' })
  // 16px title→meta rhythm (EC-5, review-2)`.
- **design.md §IV** (proximity / 4pt rhythm) + **§I** (hierarchy / breathing room) — the violated standards.

## §1 — Root cause
`entity-view.tsx:72` — `TitleGroup = styled(View, { flexShrink: 1 })` has **no `gap`** → the `$display` serif title
(`:148`) and the `$small` muted subtitle (`:151-155`) render flush (subtitle jammed under the title's descenders). The
parent `Header` (`:70`) already carries `gap:'$8'` (title-row → mode-toolbar); the cram is purely inside `TitleGroup`.

## §2 — Decision (doc-resolved, NOT re-opened)
- **No eyebrow / no new prop.** EC-5 explicitly rejects the all-caps eyebrow as a generic tell; the title carries alone.
  (An "add eyebrow prop" option was considered and dropped — it contradicts EC-5.)
- **Gap = `$16`** (review-2 value), mirroring the shipped flow-session precedent — NOT the draft `$12`.
- **Subtitle = ONE quiet plain-language `$small` muted line, never a middle-dot meta-string.** Enforced by construction:
  the component already wraps `subtitle` in `<Text $small muted>`, which forbids a block child — so a quantity BAR is
  never crammed into the subtitle. A `HonestProgress` bar is **separate header chrome the consumer composes** (the flow
  shell's `HeaderAside` precedent); EntityView gains **no** progress slot now (No-Guessing — no built consumer; the
  `useEntity` hook is deferred to the first entity page).

## §3 — Change set (minimal; no API change)
1. **`entity-view.tsx:72`** — `TitleGroup` → `{ flexShrink: 1, gap: '$16' }` + a comment citing EC-5 / review-2 +
   the flow-session precedent.
2. **`entity-view.stories.tsx:79`** — replace `"Project · 3 milestones · updated 2h ago…"` (the rejected dot-pile) with
   ONE quiet plain-language line (e.g. `"In the Q3 Launch project"`), so the Visual-Gate surface shows the canonical
   pattern. Page-less variant keeps a plain line (no `· no page` dot-tack).
3. **`packages/ui/src/CLAUDE.md`** (entity-view paragraph) — pin the title-hero header convention (§XXIX currency):
   serif `$display` title carries alone; subtitle = ONE quiet `$small` muted plain-language line (NOT a dot-pile);
   `$16` title→metadata rhythm; no eyebrow; a quantity → a `HonestProgress` bar composed by the consumer, not the
   subtitle text.

## §4 — Caller map (regression watchlist)
- `packages/ui/src/index.ts:71` — barrel export (unchanged; no API delta).
- `entity-view.stories.tsx` — Visual-Gate surface (updated subtitle).
- `entity-view.test.tsx` — jsdom tests (most pass no subtitle; a gap on a styled `View` does not change DOM/roles →
  expect 0 test changes; confirm green).
- `apps/web/src/entity/adapter.ts` — `toEntityProps` passes `subtitle` through (no render; unaffected).

## §5 — Acceptance
- `TitleGroup` renders `$16` between title and subtitle; no cram at any preset/mode/density.
- **Visual Gate** (Brave, 3 presets × light/dark + 375): title-hero rhythm reads; subtitle is ONE quiet line; AA holds
  (muted subtitle ≥ 4.5 incl. warm-dark); axe 0; no 375 overflow. **Watch-item:** confirm the `Header` `$8`
  (title-block → mode-toolbar) still reads correctly below a `$16` internal gap; only touch it if the gate shows it wrong.
- `tsc --noEmit` 0 · `@vida/ui` tests green (no delta expected) · eslint 0.
