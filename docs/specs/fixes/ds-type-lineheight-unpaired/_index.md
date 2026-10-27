# Fix: large type (`$display`/`$heading`/`$subheading`) renders with the BODY line-height (24px) — wrapped titles overlap

Status: **root fixed (2026-10-18) · siblings recorded** — the convention Rule is in `packages/ui/src/CLAUDE.md` and the CanvasView title pairs `lineHeight="$display"` (Visual Gate PASS, 36/41). Previously: **diagnosed · homing doc-decided** — STRUCTURAL. The ROOT binding (the pairing convention) + the SURFACED site
(the CanvasView title) are fixed in `docs/specs/fixes/fe-calendar-s1-chrome-375/` **F3** (the root-fix-in-the-surfacing-
unit precedent, decisions.md:1117,1119); the remaining sites are **recorded sibling fixes** (§Sibling records — the
decisions.md:109 precedent)
Classification: **STRUCTURAL** (a design-system typography mapping gap; the same cause in 25 files across 2 packages)
Found: 2026-10-18 by the fe-calendar #19 S2 Visual Gate (the CanvasView period title overlapping itself at 375); root-
caused under `victor:triage`. Owner: **`@vida/ui` typography / DS-4** — NOT fe-calendar (it merely surfaced it).
Sibling: `docs/specs/fixes/fe-calendar-s1-chrome-375/` (the isolated S1 chrome defects).

## Findings
At 375 the CanvasView title "This week · Oct 12 – Oct 18, 2026" wraps to 2 lines and the lines collide. **Measured in
Brave on the real surface, all 3 presets** [probe 2026-10-18]:

| preset | font | font-size | **line-height** | 2-line box | line tops |
|---|---|---|---|---|---|
| editorial | Spectral | 36px | **24px** | 48px | 36 / 60 |
| reader | Fraunces | 36px | **24px** | 48px | 42 / 66 |
| quietDesk | Source Serif 4 | 36px | **24px** | 48px | 39 / 63 |

24px is the **body** line-height (16 × 1.5), not display's (36 × 1.15 ≈ 41). No inline/class line-height is set on the
element — it inherits the font's **`$true`** default.

## Facets
- **The mechanism (code-confirmed).** DS-4 builds a **role-keyed** size + line-height scale and a `true` default =
  body [FACT: packages/ui/src/tamagui.config.ts:26-28 — `lineScale = {…role: round(size×ratio), true: round(body×1.5)}`;
  :53,:60 both `createFont`s use it]. DS-4 §1.1-D fixed the consumer convention for **size only** — *"keep the role keys
  as the token names (`fontSize="$body"`)"* — and **specified no consumer convention for line-height** [FACT:
  docs/specs/components/ds-4-tamagui-config-dark-mode/_index.md:36-41]. A `<Text>`'s `lineHeight` resolves
  independently of `fontSize` (measured: 36px size, 24px line-height, no inline/class override), so every
  `fontSize="$display"` without a `lineHeight` gets the `$true` line box (24px). The defect is the UNSPECIFIED pairing,
  not a wrong value in the scale (the scale's `display: 41` exists and is simply never selected).
- **The binding standard it violates:** the type scale pairs every size with its leading — *Display 32–40px / **tight
  leading**; Heading 24px / **1.3**; Subheading 18px / **1.4**; Body 16px / **1.5*** [FACT: ~/dev-toolkit/standards/
  design.md §III]. A 36px display line set on a 24px line box (0.67×) is outside every row.
- **Why latent (doc-confirmed):** DS-4's §4 render assertion verified only that **font size** resolves at runtime —
  *"Font size RESOLVES at runtime … `<Text fontSize="$body">`"* [FACT: ds-4 _index.md:131]; line-height was never
  asserted. And a SINGLE-line large title looks roughly right (glyphs overflow a 24px box by ~6px top/bottom); only
  WRAPPING exposes it — every shipped Visual Gate used titles that fit on one line at the measured widths. [INTERP — single-line ink overflow could still clip under an `overflow:hidden`
  ancestor or touch a tight `$4` neighbour; not measured beyond the CanvasView title.]
- **Blast radius — 25 files render large type** (`fontSize` `$display`/`$displayLarge`/`$heading`/`$subheading`),
  essentially none pairing `lineHeight` [grep 2026-10-18, non-test/story]:
  - `@vida/ui` (10): canvas-view · entity-view · flow-session-view · canvas-reader · dialog · empty-state ·
    pomodoro-widget · dashboard-view · calendar-view · agenda-view.
  - `apps/web` (15): settings (surface + 5 panes) · gamification (surface, xp-hero) · home-surface · shell (app-shell,
    shell-panel) · notifications (surface, lens-dispatches) · onboarding (onboarding, guided-setup).
  Any of these whose large text WRAPS (narrow widths, long user-named titles, translated copy) overlaps.
- **Reproduction:** any `<Text fontSize="$display">` long enough to wrap at 375 → `getComputedStyle(el).lineHeight` =
  `24px` with `font-size: 36px`.

## Files
- `packages/ui/src/tamagui.config.ts:26-28,53,60` — the scale + `$true` default (the source of the inherited 24px).
- The 25 consumer files above (where large type is declared without a paired line-height).
- `docs/specs/components/ds-4-tamagui-config-dark-mode/_index.md` §1.1-D — the design assumption that didn't hold.

## Root cause
> The overlap is caused by **DS-4 never specifying how a type role's line-height is paired with its font-size**
> (consumers set `fontSize="$role"` only, and Tamagui resolves `lineHeight` independently, falling back to the body
> `$true` 24px), not by the CanvasView title or the calendar copy.

## Fix direction — DOC-DECIDED (grounding pass 2, 2026-10-18)
- **Mechanism (installed API, verified):** `@vida/ui`'s stack is `@tamagui/core` **2.6.2 only** (ADR-001 — no
  `tamagui` package, so no `SizableText`). Its `Text` has **no** size→line-height pairing — variants are `numberOfLines`
  and `ellipsis` only [FACT: @tamagui/web@2.6.2 dist/esm/views/Text.mjs:16-29]. There is no single config switch: one
  `$true` line-height cannot fit every size, and a unitless ratio is impossible (Tamagui needs absolute px — DEF-U4-e).
  So the root binding is the **convention** design.md §III already requires: **every large-type `<Text>` pairs
  `lineHeight="$<role>"` with `fontSize="$<role>"`** (the role-keyed `lineScale` holds the values; nothing new to emit).
- **Homing:** a shared defect surfaced by a unit's own gate gets its ROOT fix in that unit (decisions.md:1117 #7 EC-7
  "the token bind fixes all"; :1119-1120 #15). → **`fe-calendar-s1-chrome-375` F3:** record the convention as a
  `packages/ui/src/CLAUDE.md` Rule + apply it to the surfaced site (the `CanvasView` title — every CanvasView consumer
  benefits) + verify at runtime that `lineHeight="$display"` resolves (the DS-4 §4 size-only-assertion lesson).
- **Withdrawn:** my earlier (B) "net-new typography primitive / SizableText" — the installed stack has no SizableText,
  and the docs home the root fix in the surfacing flow, not a new DS unit. (A) per-site patching remains the sibling
  work below, now under a stated convention rather than ad hoc.

## Sibling records (latent, found by inspection — "→ sibling fix", decisions.md:109 precedent; NOT folded)
1. **Unpaired large type — 23 sites** (the 25-file sweep minus the CanvasView title fixed in F3 and the EntityView title
   fixed by notes-rescope R1 DEV-R1-1, 2026-10-27): `@vida/ui` flow-session-view · canvas-reader · dialog · empty-state · pomodoro-widget · dashboard-view · calendar-view ·
   agenda-view; `apps/web` settings (surface + 5 panes) · gamification (surface, xp-hero) · home-surface · shell
   (app-shell, shell-panel) · notifications (surface, lens-dispatches) · onboarding (onboarding, guided-setup). Note
   `lens-dispatches.tsx:33,75` already worked around this with raw px (`lineHeight={40}`/`{30}`) — which breaks the
   recorded *"semantic type scale only, no px"* (decisions.md:57); its sibling fix swaps px → the role token.
2. **`sm` (32px) controls failing their units' OWN documented ≥44×44 MUSTs** (design.md §X; `size="sm"` is "below the
   §X / WCAG 2.5.5 floor" — PLAN-S4-selection.md:60): shell nav chrome (s2-nav-chrome.md:112,142,181 —
   `global-surfaces-strip.tsx:58,70`, `scope-selector.tsx:53-120`) and the Collection condense (fe-codec-collection
   slice-map:113 EC-4 "375 condense + ≥44×44" — `collection-view.tsx:205`). The Button contract has no touch-target
   clause (ds-5 button.md), which is how `sm` keeps slipping through.
3. **UI-1 `Menu` item rows ≈37px tall** (`paddingVertical $8` + `$small`, menu.tsx:88) — below the same ≥44 rule; every
   menu (shell More, scope selector, Collection + Calendar condense) [g2 review, fe-calendar-s1-chrome-375 #9].
4. **Focus drop at the 768 condense swap** (toolbar ⇄ Menu unmount the focused control) — shared by the Collection and
   Calendar condense [g2 review #8].
Each is triaged + gated as its own fix when picked up (the triage protocol); neither blocks fe-calendar.

## Change log
| Date | Change |
|------|--------|
| 2026-10-18 | **Grounding pass 2 (Victor: "the decisions are in there")** — homing doc-decided: root fix (convention + CanvasView title) IN `fe-calendar-s1-chrome-375` F3 per decisions.md:1117,1119; option B withdrawn (installed @tamagui/core 2.6.2 has no SizableText/size pairing); remaining sites + the `sm`-touch-target gaps recorded as sibling fixes per decisions.md:109. |
| 2026-10-18 | **Grounding pass (Victor: "ground everything in the documentation")** — corrected "DS-4 assumed pairing" (my INTERP) to the FACT: DS-4 §1.1-D specified the `fontSize` convention only and left line-height pairing unspecified; added the binding standard violated (design.md §III size↔leading pairs); doc-confirmed why latent (DS-4 §4:131 asserted size only); established option B is net-new DS scope (no Text contract in DS-5). |
| 2026-10-18 | Diagnosed under victor:triage — measured (3 presets, Brave) + code-confirmed (tamagui.config.ts:26-28; DS-4 §1.1-D); blast radius 25 files; options A/B/C, B recommended pending /verify. |
