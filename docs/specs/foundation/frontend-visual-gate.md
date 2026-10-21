# Frontend Visual Gate — Definition & Implementation Plan
Status: **approved + implemented** (Victor approved the gate shape 2026-08-03; render built + smoke-tested; integrated into DS-2 §4)
Owner-decision: Victor 2026-08-03. Applies to: visual frontend issues (DS / UI / UX).
Kind: process gate (composes existing toolkit skills + adds a visual-render + human visual-approval stage).

## 0. Source model
Inherits the frontend source-of-truth direction: `docs/specs/foundation/frontend-source-of-truth.md` (code-first
interim; Figma-later via MCP scripter). The visual render is produced from the **code** (the shipped tokens/
components), which is the interim source of truth — so "what Victor approves visually" and "what ships" are the
same artifact, by construction.

## Why this gate exists
Frontend issues have a **visual outcome** that a written spec cannot convey. A critique can confirm a palette meets
contrast math and a type scale matches design.md — but only *seeing it rendered* tells whether it reads as one
coherent, intentional surface. This gate makes the visual outcome a **first-class, enforced approval stage**, so no
visual frontend work ships on prose approval alone.

## Applicability — which issues are "visual-gated"
An issue runs the Visual Gate **iff it produces a rendered visual surface**. Predicate:
- **Visual-gated (full gate):** DS token *values* (color/type/space/radius/shadow), DS motion, UI primitives &
  composites, platform views, app-shell/layout, UX empty/loading/error states, onboarding screens — anything a user
  *sees*.
- **NOT visual-gated (normal LITE/§XXVI gate only):** pure plumbing with no rendered surface — e.g. the DS-2/DS-1
  *pipeline mechanics* (source-list change, aux-skip, `fonts.ts` emitter, B8 assertion), UX state-*conventions*
  logic, sync/state wiring. These get preflight + critique but **no** visual-approval stage (nothing to look at).
- **Mixed issue (e.g. DS-2):** split the approval — the pipeline-extension code ships on the normal gate; the
  **token values** (the visual part) ship only through the full Visual Gate.

## The gate — four stages (all must pass, in order)
1. **Preflight** (`victor:preflight`) — inputs/spec complete, No-Guessing, no silent gaps. → PASSED.
2. **Critique** (independent adversarial critic + the `victor:quality-gate-design` lens) — grounded + standards-
   compliant: contrast AA both modes, dark = parallel not inverted (design.md §XI), token-compliance, a11y. → SHIP
   (or REVISE→fixed).
3. **Visual render** — produce the actual rendered artifact from the shipped code (see §Render mechanism). Repeatable,
   deterministic, one command.
4. **Victor's visual approval** — Victor opens the render, judges the *look*, approves or requests changes. This is
   the terminal human gate; nothing visual ships without it. Recorded in the issue/spec change log
   (`visual-approved: <date>`).

## Render mechanism (how stage 3 produces something to look at)
| Artifact type | Render | Command | Status |
|---|---|---|---|
| **Design tokens** (DS-2/DS-3) | self-contained `preview.html` gallery from the generated `variables.css` — color swatches (all ramps + semantics), type-scale samples, spacing/size/radius boxes, shadow samples; light/dark toggle | `pnpm preview:tokens` → open `packages/ui/src/themes/preview.html` | **built now** (`tools/scripts/render-token-preview.mjs`) |
| **Components** (DS-5/UI-*) | Storybook story (or a preview page) per component, all 8 states | `pnpm storybook` | deferred — Storybook stands up at DS-5/UI-1 (out of scope here) |
| **Screens/layout** (UX/app-shell) | running app screenshot at the 3 breakpoints (375/768/1440) | `pnpm dev` + capture | deferred to those units · **+ the LIVE leg on the entity's closing slice:** the running app on real OPFS, not `?sample` — write → reload → persist, every pinned EC re-verified (golive-replan ELC-7/9) |

The token render is the concrete mechanism built now; the others are named so the gate is complete-by-design, built
at their first-consumer unit (matches the roadmap's "substrates by first-consumer pull").

## Plan (protocol)
**Done when:** a defined, enforced Visual Gate exists — applicability predicate + 4 stages + a *working* token-render
mechanism (`pnpm preview:tokens` emits a real gallery from the current tokens) — integrated into the Design System
scenario + the §XXVI per-step gate, with DS-2's token values wired to route their approval through it. **Not
included:** Storybook, component/screen renders (built at their units), DS-2's actual values (Step 2), any toolkit-
skill promotion.

**Steps:**
1. Define the gate (this doc — applicability, 4 stages, render table, recording). — depends on: nothing — risk: none.
2. Build `tools/scripts/render-token-preview.mjs` — parse `variables.css`, resolve `var()` chains, categorize by
   prefix, emit a self-contained `preview.html` gallery with a light/dark toggle. — depends on: 1 — risk: dark toggle
   can't show real dark values until DS-2's overlay lands → render light now, dark section wired but placeholder-equal
   (honest label), real dark after Step 2.
3. Wire `pnpm preview:tokens` (root) + a `packages/ui` script. — depends on: 2 — risk: none.
4. Smoke-test on the current (placeholder) tokens → a real `preview.html` opens and shows the DS-1 seed. — depends
   on: 2,3 — risk: none (proves the mechanism before real values exist).
5. Integrate — add the Visual Gate to DS-2 spec §4 acceptance (token values) + a note in the DS scenario usage. —
   depends on: 1 — risk: none.

**Out of scope:** Storybook · component/screen render mechanisms · DS-2 values · promoting this to a `~/dev-toolkit`
skill (project-local for now; promote later if it proves out).

## Approval log
| Date | Stage | Result |
|------|-------|--------|
| 2026-08-03 | render built | `render-token-preview.mjs` + `pnpm preview:tokens` — smoke-tested on DS-1 seed: 16 tokens / 6 categories, deterministic (byte-identical re-run), `preview.html` gitignored. |
| 2026-08-03 | gate-shape approval | **APPROVED** (Victor) — 4 stages + applicability predicate + render mechanism. First real use: DS-2 token values. |
| 2026-08-03 | DS-2 token values — first run | **1 preflight** ✓ · **2 critique/contrast** ✓ (AA both modes; caveat white-on-brand.500=4.47→brand.600 for buttons) · **3 render** ✓ (`pnpm preview:tokens`, 113 tokens, light/dark toggle) · **4 visual approval** = **PASS (provisional)** — Victor approved for now, **flagged ⚠ INTENDED-IMMATURE**: palette is a generic placeholder, brand identity replaces the VALUES later ([[ds-2-palette-is-provisional-placeholder]]). |
| 2026-08-03 | DS-3 motion values — second run | **1 preflight** ✓ · **2 post-impl critique** ✓ SHIP (fonts↔motion leak closed by construction; 2 NITs incl. linear-type→fixed) · **3 render** ✓ (`pnpm preview:tokens`, 121 tokens; new motion section: 4 durations × 4 easings, animate transform+opacity only, honors `prefers-reduced-motion`) · **4 visual approval** = **PASS** — Victor approved after one render fix (`instant` 0ms rendered as a 1ms flicker-loop → now static/immediate). Values are standard-derived (`motion.md §IX`), not a provisional placeholder. |
| 2026-08-03 | DS-4 dark-mode surface — third run | **1 preflight** ✓ · **2 critique** ✓ (plan REVISE→fixed; RN-driver drift triaged STRUCTURAL + corrected to `@tamagui/animations-css`; 30/30 runtime-verified) · **3 render** ✓ (`pnpm preview:tokens` gains a **DS-4 theme-surface section** — a composed mock card rendered light ｜ dark from the config's resolved themes: surface #FFFFFF/#0F172A, text, muted, brand-emphasis button, secondary panel, borders) · **4 visual approval** = **PASS** (Victor) — dark reads as a coherent designed surface, not an inversion; brand button legible both modes. |
