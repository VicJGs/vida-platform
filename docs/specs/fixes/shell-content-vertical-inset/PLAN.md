# PLAN / Fix — Shell content region has no vertical inset (whole-OS)

> §XXVI forward spec (code profile). Branch `fe-shell-content-inset` off `main @1458b67`. Reported by Victor
> (2026-10-15) during the fe-session-runtime #23 Visual Gate review. No-Guessing: `[FACT: path:line]`.

## §1 — Diagnosis (the finding)

- **Symptom:** every routed page's top content sits flush against the reserved top strip; no top/bottom breathing room OS-wide.
- **Root cause:** `ContentMain` sets `paddingHorizontal={gutter}` with **no `paddingVertical`** `[FACT: apps/web/src/shell/app-shell.tsx:317-325]`.
- **Why it was missed:** the spec defines only HORIZONTAL content padding — "side padding 16/24/32" `[FACT: docs/core/architecture/shell-layout.md:84]`; design.md §X gives side padding only `[FACT: standards/design.md §X:224-227]`. The shell faithfully applied the horizontal gutter; the vertical inset is a **genuine spec gap**, not a code slip.
- **Classification: STRUCTURAL** — the shared content region; every page inherits it. One fix location, OS-wide effect.
- **Scope:** `fe-shell` (#14). Independent of fe-session-runtime #23 (which renders into `ContentMain` and inherits the fix).

## §2 — Business rules

- **BR-1** — the content vertical inset is a **shell-owned model constant** (like `reservedTopInset`), NOT invented inline;
  it lives in the model (`breakpoints.ts`) + an accessor (`regions.ts`), consumed by the chrome (`app-shell.tsx`). The
  shell rule "apply the standard, never invent" is satisfied by **closing the spec gap** (shell-layout.md) — the inset is
  part of the shell's own layout model (the reflow model "is the one thing not in the standard"). `[FACT: shell/CLAUDE.md Rules]`
- **BR-2** — on the 4pt grid; `wide` shares `desktop` (mirrors `contentGutterAt`). `[FACT: regions.ts:97-99]`
- **BR-3** — vertical only; the horizontal gutter is unchanged. No other shell behavior touched.

## §3 — Contract (the change)

- `apps/web/src/shell/breakpoints.ts`: add `export const CONTENT_V_INSET = { mobile: 24, tablet: 32, desktop: 40 } as const`
  (Victor's decision 2026-10-15 — a touch > the side gutter so the strip has clear separation; 4pt grid).
- `apps/web/src/shell/regions.ts`: add `export function contentVInsetAt(bp: Breakpoint): number` (= `CONTENT_V_INSET[bp==='wide'?'desktop':bp]`), the `contentGutterAt` twin.
- `apps/web/src/shell/app-shell.tsx`: `ContentMain` gains `paddingVertical={vinset}` where `const vinset = contentVInsetAt(bp)`.
- `docs/core/architecture/shell-layout.md:84`: extend the Container rule — "side padding 16/24/32; **content vertical inset 24/32/40**".
- `apps/web/src/shell/CLAUDE.md`: note `CONTENT_V_INSET` (breakpoints.ts) + `contentVInsetAt` (regions.ts) + the ContentMain vertical inset.

## §4 — Acceptance

- `tsc` 0 · `eslint` 0 · existing shell tests still green (app-shell/module-dock/etc.).
- A `breakpoints`/`regions` unit test asserting `contentVInsetAt` returns 24/32/40/40 (mobile/tablet/desktop/wide).
- **Visual Gate (real shell, standalone or driven app):** content clears the top strip with the 24/32/40 inset at
  375/768/1440 × light/dark × ≥1 preset; no new overflow; axe clean. Victor reviews.
- Currency §XXIX: refresh the shell context docs if touched (shell-layout.md is the spec; CLAUDE.md the layer doc).

## §5 — Implementation prompt (ordered)

1. `breakpoints.ts` — `CONTENT_V_INSET` + doc comment.
2. `regions.ts` — `contentVInsetAt` (the `contentGutterAt` twin).
3. `app-shell.tsx` — `const vinset = contentVInsetAt(bp)`; `ContentMain paddingVertical={vinset}`.
4. unit test for `contentVInsetAt`.
5. `shell-layout.md:84` + `shell/CLAUDE.md` — close the spec gap + note the new model constant.
6. `tsc`/`eslint`/tests green → Visual Gate (Victor review) → commit.

## Critique (self, §XXVI.2)

SHIP — surgical, model-faithful (constant→accessor→chrome, the `reservedTopInset`/`contentGutterAt` precedent), closes the
spec gap rather than inventing an inline value. No blocking issues.

## Preflight (§XXVI.4)

PASSED — all layers specified (model constant · accessor · chrome consumption · spec · layer doc · test · Visual Gate).
One assumption: `ContentMain`'s `overflowY:auto` + `paddingVertical` renders the bottom inset inside the scroll area
(standard); verified visually at the gate. No open gaps.
