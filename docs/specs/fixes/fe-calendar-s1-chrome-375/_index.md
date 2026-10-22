# Fix: fe-calendar #19 S1 chrome — range switcher never condenses <768 (375 page overflow) + "This week ·" on every week

Status: **resolved** (2026-10-18) — Visual Gate PASS, Victor-reviewed
Classification: **ISOLATED** for F1/F2 (one surface file — `apps/web/src/app/calendar/index.tsx`) + **F3** = the
surfaced-root fix of the STRUCTURAL line-height defect (`packages/ui/src/components/canvas-view.tsx` title + the DS
convention Rule), per the documented root-fix-in-the-surfacing-unit precedent (decisions.md:1117,1119)
Found: 2026-10-18, by the fe-calendar S2 Visual Gate (`614c6b9`), reproduced on S1's own Month range at `a1148f9`.
Unit: fe-calendar #19 (LIF-203) · slice S1 (`a1148f9`). Sibling (STRUCTURAL, separate unit):
`docs/specs/fixes/ds-type-lineheight-unpaired/` — the period-title overlap.

## Findings
1. **375 page overflow (EC-1 unmet).** At 375px `document.scrollWidth` = **520** (vw 375) on BOTH the Agenda and the
   Month range. The outermost offender is the `CanvasView` actions row carrying S1's range switcher (`role="toolbar"`,
   6 `Button`s) + the `‹ Today ›` nav — **496px** wide, unwrapped. EC-1 is a locked structural MUST: *"Range switcher — 6
   ranges … as a `role="toolbar"` with `aria-pressed` on the active; **reflows to a dropdown < 768 (Collection
   precedent)**"* [FACT: envision.md:23; slice-map.md:34 S1 "condense to a `Menu` < 768"]. S1 never built the condense
   [FACT: `a1148f9` apps/web/src/app/calendar/index.tsx:76-99 — a `flexWrap` toolbar, no Menu, no breakpoint read], yet
   the S1 ledger recorded "375/768/1440 no-overflow ✓" [FACT: slice-map.md S1 row] — a false PASS.
2. **"This week ·" on every week.** `periodLabel()` prefixes `This week · ` for `agenda`/`living` whatever week is
   focused [FACT: index.tsx:43 — `return range === 'week' ? span : \`This week · ${span}\``]. Pressing › twice on Agenda
   reads "This week · Nov 2 – Nov 8, 2026". Latent in S1 (agenda/living were placeholders); visible since S2.

## Facets
- **Symptom vs cause:** the symptom is a horizontal page scroll; the cause is a missing responsive behaviour the spec
  required, not a layout bug in the frame. `CanvasView`'s `Actions` is deliberately `flexShrink:0`
  [FACT: packages/ui/src/components/canvas-view.tsx:80] and its masthead contract is "title-group · actions reflow
  below at 375" [FACT: ui CLAUDE.md canvas-view BR-CB-S1-12] — i.e. the CONSUMER must keep `actions` compact (the
  Collection condense is exactly that). The frame is correct; the consumer under-delivered.
- **Why latent / mis-gated:** S1's gate passed it; it surfaced only when S2's gate scored PAGE overflow separately from
  REGION overflow. (Memory: split-region-vs-page-overflow.)
- **Reproduction:** `/calendar` (or the probe harness) at 375 → any range → horizontal scroll; Agenda → › → title
  still "This week ·".
- **Blast radius:** this surface only (every range shares the actions row). No other consumer.

## Files
- `apps/web/src/app/calendar/index.tsx` — switcher + `periodLabel` (both defects).
- Precedents (read, not changed): `apps/web/src/shell/regions.ts:66-69` (the `useMedia()` contract) ·
  `shell/global-bar-1.tsx:21-30` (`__bp` override) · `collection-view.tsx:200-215` (the Menu condense shape) ·
  `docs/core/architecture/shell-layout.md §3` (the ≥44 rule) · `button.tsx:67-69` (sm 32 / md 40 / lg 48).

## Root cause
> The 375 overflow is caused by **S1 never building EC-1's <768 switcher condense** (a 6-button toolbar + nav in a
> non-shrinking `actions` slot), not by the CanvasView frame; the stale label is caused by **`periodLabel` hard-coding
> "This week ·"** instead of comparing the focused week to the current one.

---

## PLAN (gate 1) — the fix

**F1 · EC-1 condense (build what S1 owed).** Below 768 the range switcher renders as a UI-1 `Menu` whose trigger is a
ghost `Button` labelled **`Range: <active>`** (e.g. "Range: Agenda" — the Collection `View: <label>` convention, no
caret glyph), items = the 6 ranges with a ✓ leading mark on the active one, `onSelect` → `setRange` — a verbatim
mirror of the CollectionView condense [FACT: collection-view.tsx:200-215]. ≥768 the current `role="toolbar"` +
`aria-pressed` buttons stay unchanged. The `‹ Today ›` nav stays in both (3 compact controls). Accessible names: the
Menu `aria-label="Calendar range"` (= the toolbar's name, so AT hears the same control in both forms). **Active-state
a11y in the condensed form:** `aria-pressed` doesn't exist on menu items, so the active range is conveyed by the
TRIGGER's label text (announced on focus) + the visual ✓ — the shipped Collection precedent, accepted as-is (a
`menuitemradio` upgrade would be a Menu-primitive change, out of scope).

**D1 · the breakpoint read — the apps/web convention: Tamagui `useMedia()` + a `__bp` test override.** The documented
apps/web contract is *"the current breakpoint is read reactively via Tamagui `useMedia()`, NOT stored"* [FACT:
apps/web/src/shell/regions.ts:66-69], and every apps/web consumer follows it with a `__bp?: Breakpoint` test/story
override that bypasses `useMedia` for jsdom [FACT: shell/global-bar-1.tsx:21-30 `const isTabletUp = __bp ? __bp !==
'mobile' : media.tablet`; session-hud/session-hud.tsx:26-32; AppShell.__bp]. `CalendarSurface` adopts exactly that
(`media.tablet` ⇔ ≥768 = `config.media.tablet` — the EC-1 threshold). **No `@vida/ui` change for the breakpoint** (F3 is the only `@vida/ui` edit). (Superseded draft:
promoting CollectionView's module-private `matchMedia` `useTabletUp` — that bespoke hook exists only because it lives
INSIDE `@vida/ui` [FACT: collection-view.tsx:32-35]; the apps/web plane has its own documented convention.)

**D2 · touch targets — the rebuilt controls meet ≥44×44.** *"Every interactive region honors ≥44×44px touch targets
with ≥8px gaps at all widths"* [FACT: docs/core/architecture/shell-layout.md §3 :71-72; design.md §X]. S1's switcher +
nav are `Button size="sm"` = **32px** tall [FACT: packages/ui/src/components/button.tsx:67] — below the rule. This fix
rebuilds exactly these controls, so they comply: **`size="lg"` (48px)** for the condensed trigger, the toolbar buttons
and the `‹ Today ›` nav (`md` = 40 also fails) [FACT: button.tsx:67-69], with ≥`$8` gaps. ⚠ Risk to measure at the
gate: the 6-button `lg` toolbar at exactly 768 must still fit beside/below the title; if it does not, that is a
§XXVIII deviation (not a silent threshold change — EC-1 fixes the condense at <768).

**F2 · honest period label.** `periodLabel` prefixes `This week · ` only when `mondayOf(focused)` equals
`mondayOf(today)` (date-key string compare, TZ-safe — the file's existing `toKey`); otherwise the bare span for
agenda/living (as week already does). Grounding: the approved mockup's title is *"This week · Oct 5–11"* — a
CURRENT-week depiction [FACT: mockups/calendar-ranges-and-agenda.html:127]; no doc specifies other weeks.
[INTERP: on a non-current week "This week" is a false claim → the bare span, the Week range's existing behaviour.]

**D2 is doc-decided, not a judgment call:** *"Icon-button touch target | `size="lg"` (48px, ≈56×48 ≥ 44×44), not `sm`
(32px) | §X / WCAG 2.5.5"* [FACT: .claude/docs/decisions.md:82; canvas-reader PLAN-S4-selection.md:60 BR-S4-6a "NOT
`size="sm"` (32px, below the §X / WCAG 2.5.5 floor)"; reused as "the S4 BR-S4-6a floor" in PLAN-S5-listen.md:55 +
fe-settings s1-switch.md:38]. The heavier 48px chrome is the accepted cost in every precedent.

**F3 · the period-title overlap — root fix IN this flow (doc-decided homing).** The documented precedent for a shared
defect surfaced by a unit's own gate is a ROOT fix in the surfacing unit: #7 EC-7 *"a real dark-mode bug EVERY editor
mount shared … the token bind fixes all"*; #15 *"root fix tints via currentColor, benefits scope-selector/dock/
global-bar"* [FACT: .claude/docs/decisions.md:1117,1119,1120]. The root is diagnosed in
`docs/specs/fixes/ds-type-lineheight-unpaired/`: DS-4 never specified line-height pairing, and `@tamagui/core` 2.6.2's
`Text` has NO size→line-height pairing (variants = `numberOfLines`/`ellipsis` only) [FACT:
@tamagui/web@2.6.2 dist/esm/views/Text.mjs:16-29]; `SizableText` isn't installed (core-only, ADR-001). So the root
binding is the **convention** design.md §III requires: *every large-type `<Text>` pairs `lineHeight="$<role>"` with
`fontSize="$<role>"`* (the role-keyed `lineScale` already holds the values — tamagui.config.ts:26-28). This flow:
(a) records the convention as a `packages/ui/src/CLAUDE.md` Rule; (b) applies it at the surfaced root — the
**`CanvasView` title** (`canvas-view.tsx:123`, every CanvasView consumer benefits); (c) [build-verify] that
`lineHeight="$display"` resolves to 41px at runtime (the DS-4 §4 render-assertion lesson — assert, don't assume) with a
jsdom-independent browser measurement at the gate + a unit test asserting the prop.

**Sibling fixes — recorded, NOT folded (doc-decided homing).** The precedent for latent sibling defects found by
inspection is *"→ sibling fix"* [FACT: decisions.md:109 — the `$h3` case]. Recorded in the sibling docs:
- the other 24 large-type sites without a paired line-height (incl. `lens-dispatches.tsx:33,75`'s raw-px workaround,
  which also breaks *"semantic type scale only, no px"* [decisions.md:57]) → `ds-type-lineheight-unpaired/`;
- the shipped `sm` (32px) controls failing their OWN documented ≥44 MUSTs — shell nav chrome (`s2-nav-chrome.md:112,
  142,181`; `global-surfaces-strip.tsx:58,70`, `scope-selector.tsx:53-120`) and the Collection condense (EC-4 "375
  condense + ≥44×44", fe-codec-collection slice-map:113; `collection-view.tsx:205`) → `ds-type-lineheight-unpaired/`
  §Sibling records (one place for this flow's sibling findings).


## Preflight (2026-10-18) — PASSED; assumptions pinned to code
Layers touched: frontend only (`apps/web` surface + one `@vida/ui` frame line + docs). No backend/DB/integration.
- **`__bp` typing:** `import type { Breakpoint } from '../../shell/breakpoints'` [FACT: shell/global-bar-1.tsx:10];
  `CalendarSurface({ __bp }: { __bp?: Breakpoint })` — the lazy route renders it with no props (prod → `useMedia()`).
  `isTabletUp = __bp ? __bp !== 'mobile' : media.tablet` verbatim [FACT: global-bar-1.tsx:30].
- **Test harness:** plain jsdom `render(<UIProvider>…)` — CalendarSurface uses no router hooks, so no `renderInShell`
  [FACT: global-bar-1.test.tsx uses it only because ScopeSelector routes]. New file
  `apps/web/src/app/calendar/calendar-surface.test.tsx`; period-label cases drive `useCalendarUIStore.setState`
  (`focusedDate` + `range`) and read the CanvasView title text — `periodLabel` stays module-private.
- **Menu:** the shipped UI-1 `Menu` API `{ trigger, items:{id,label,leading,onSelect}[], 'aria-label' }` [FACT:
  collection-view.tsx:203-213]; trigger = `Button size="lg" intent="ghost"` (D2).
- **F3 jsdom observability (probed, probe deleted):** a paired `lineHeight="$display"` emits a font-scoped atomic class
  `_lh-f-lineHeigh…` on the `Text`; an unpaired one emits none → the unit test asserts the title's class list contains
  `_lh-`; the RESOLVED px (≈41) is measured in Brave at the gate (jsdom has no CSS-var engine).
- **No new dep, no token, no schema.** `lg` = 48 [FACT: button.tsx:69]; `$display` line-height = round(36×1.15)=41
  [FACT: fonts.ts:6,9; tamagui.config.ts:26-28].

## Deviation record (§XXVIII) — D-FIX-DEV-1 · awaiting approval

**STOP trigger (planned):** D2 named it — *"if the 6-button lg toolbar at 768 does not fit, that is a §XXVIII
deviation."* The gate measured it [Brave, 2026-10-18, real surface]: with F1+D2+F3 built, **768 overflows in every
preset** (sw 769 editorial · 768–784) and **375 overflows in quietDesk** (sw 377 Month / 384 Agenda — its IBM Plex
chrome is wider); editorial + reader 375 fit. All other checks PASS (condense form · menu select · 48px controls · 8px
gaps · title line-height 41 · no wrap overlap · CanvasEditor/CanvasView mastheads · AA · axe 0).

**Root cause (unchanged from triage):** `CanvasView`'s `Actions` is `flexShrink:0` with no width cap and no wrap
[FACT: canvas-view.tsx:80], so a consumer's actions content can never reflow inside the row — 48px controls simply made
the content wide enough to hit it at 768.

**Revised direction — the frame meets its OWN documented contract:** BR-CB-S1-12 *"the masthead … must reflow so
`actions` wrap below the title-group (never collide) … no overflow/collision at 375/768/1440"* [FACT:
docs/specs/foundation/fe-codec-canvas-board/s1-canvas-view.md:34-35,60]. So:
- **`canvas-view.tsx` `Actions`:** add `maxWidth:'100%'` + `flexWrap:'wrap'` (row-gap `$8`) — the slot never exceeds
  the masthead width and its children wrap. Keeps `flexShrink:0` (actions don't squeeze the title; they reflow below
  it, the documented model). Every CanvasView consumer benefits (CanvasEditor's single SyncStatus chip is unaffected —
  re-verified at the gate).
- **`CalendarSurface`:** pass `{switcher}{nav}` as the slot's direct children (a fragment) instead of an extra
  non-shrinking wrapper `View`, so the frame's wrap applies to them: at 768 the nav wraps under the toolbar; at 375
  (quietDesk) under the `Range:` trigger.
- **Rejected:** moving the condense above 768 (EC-1 fixes "<768" — a doc change, not a fix); `md`/`sm` controls
  (decisions.md:82 floor); hiding the nav (removes primary navigation).

**Folded with it (g2 review — in-scope, same controls/tests):**
- **F4 · `shift()` month/year rollover** [review #4, code-confirmed index.tsx:46-53]: `setMonth` on Jan 31 → "Mar 3"
  skips February on the rebuilt ‹/› nav. Clamp the day to the target month's last day.
- **Test hardening** [review #6, #7]: the canvas-view assertion compares the title's `_lh-` class to the class a
  reference `lineHeight="$display"` `Text` emits (not "any `_lh-`"); the surface tests pin "now" with
  `vi.setSystemTime` near BRT midnight (Sun 23:30 −03:00 = Mon UTC) so a UTC slip in the week maths turns red.

**Review findings NOT folded (with reasons):**
- #3 currency not in diff — by plan order (currency follows the gate). Not a defect.
- #5 "today" read at render goes stale across midnight — the surface-wide S1 pattern (also `CalendarView today=`);
  `useCalendar` (S7) owns "today" → recorded for S7, not this fix.
- #8 focus drops when the 768 boundary swaps toolbar⇄Menu — the shipped Collection condense has the identical
  behaviour; a shared concern → sibling record.
- #9 Menu item rows ≈37px < 44 — the UI-1 `Menu` primitive (every menu, incl. the shell's) → added to the `sm`/touch
  sibling record (same class: the DS-5 contracts carry no touch-target clause).
- #10 condense block duplicated from CollectionView — 2 copies; the house extracts at the rule of THREE (the data-view
  spine precedent, ui CLAUDE.md "extracted at V3 (rule of three)") → no extraction now.

**Critique:** real (gate-measured) and sound — it is the frame honouring BR-CB-S1-12, the smallest change that cures the
cause rather than the 768 symptom. **Preflight:** complete — Acceptance unchanged except: page overflow 0 at 375/768/
1440 in ALL presets (now incl. quietDesk) · CanvasEditor masthead re-verified · F4 (Jan 31 › → February) + the two
hardened tests. **Approval:** required before any further code.

## Resolution (2026-10-18)
Shipped exactly the approved plan + D-FIX-DEV-1:
- `apps/web/src/app/calendar/index.tsx` — `__bp?: Breakpoint` prop + `useMedia()` (`isTabletUp`); <768 → `Menu`
  "Calendar range" with a `Range: <active>` lg trigger + ✓ on the active item; ≥768 → the `role="toolbar"` (`aria-pressed`);
  every range control `size="lg"` (48px), gaps `$8`; `{switcher}{nav}` passed as the actions slot's DIRECT children;
  `periodLabel` prefixes "This week ·" only when `mondayOf(focused)` = `mondayOf(today)`; `shift()` month/year via
  `addMonthsClamped` (Jan 31 › → Feb 28).
- `packages/ui/src/components/canvas-view.tsx` — title `lineHeight="$display"`; `Actions` `maxWidth:'100%'` +
  `flexWrap:'wrap'` (BR-CB-S1-12 realized).
- Tests: `apps/web/src/app/calendar/calendar-surface.test.tsx` 10/10 (`__bp` condense · menu select · toolbar ·
  period label with "now" pinned at Sun 23:30 BRT = Mon UTC + a live-TZ guard · clamped month/year nav);
  `canvas-view.test.tsx` 10/10 (the title's `_lh-` class == a reference `lineHeight="$display"` Text's, ≠ `$body`'s —
  mutation-checked: a `$body` pairing turns it red).
- Visual Gate PASS (Victor-reviewed): 60 measured cells — calendar Agenda + Month × 3 presets × L/D × 375/768/1440 +
  CanvasView (single + wrapping) + CanvasEditor: **0 page overflow** · condense form + real menu select · controls 48px ·
  gaps ≥8 · title 36/41, wrapped steps 41 (no overlap), clears meta · title AA · axe 0 · 0 pageerrors.
- Currency: `packages/ui/src/CLAUDE.md` (line-height Rule + canvas-view note) · `s1-canvas-view.md` (BR-CB-S1-12 realized +
  change log) · `web-client-runtime/current-spec.md` · `slice-map.md` S1 row CORRECTED (the false PASS recorded).

## Acceptance
- [ ] 375: `scrollWidth === clientWidth` on every range (page-level, not just region) — all 3 presets × L/D.
- [ ] <768: a `Menu` named "Calendar range" whose trigger shows the active range; selecting an item switches range;
      ✓ on the active item; keyboard (Menu's roving focus + Esc) per the shipped Menu. ≥768: the toolbar unchanged
      (`aria-pressed`).
- [ ] Breakpoint via `useMedia()` + a `__bp` override prop (the global-bar-1 convention); no `@vida/ui` hook change (F3 = the only `@vida/ui` edit).
- [ ] Every rebuilt control (condensed trigger · toolbar buttons · ‹ Today ›) ≥44×44 with ≥8px gaps, all widths —
      measured at the gate; the 768 lg-toolbar fit measured explicitly.
- [ ] Agenda/Living: "This week ·" only on the current week; ‹/› to another week → bare span.
- [ ] F3: the CanvasView title computes `line-height` = the display role (≈41px for 36px) in all 3 presets, measured in
      Brave; a wrapped title at 375 shows NO line overlap (screenshot); every existing canvas-view test green + a new
      test asserting the paired `lineHeight` prop. The convention is a `packages/ui/src/CLAUDE.md` Rule.
- [ ] F3 blast check (shared-primitive root fix ⇒ re-verify ALL consumers — the #15 precedent): the OTHER live
      CanvasView consumer, **`CanvasEditor`** (`apps/web/src/canvas-editor/canvas-editor.tsx`), and the CanvasView
      stories (a single-line + a wrapping title) at the gate — masthead renders correctly, no clipping/overlap, the
      title→meta `$4`/eyebrow rhythm intact (the taller line box is the intended correction). The jsdom `_lh-` class
      assertion is coupled to Tamagui's atomic-class naming — accepted, because the Brave px measurement is the
      authoritative check.
- [ ] Tests (jsdom, `__bp`-driven — the global-bar-1 test precedent): periodLabel (current vs other week, TZ-forced) ·
      `__bp="mobile"` → a `Menu` named "Calendar range", NO toolbar · `__bp="tablet"` → the toolbar with `aria-pressed`.
      tsc 0 · eslint 0.
- [ ] Visual Gate (Victor-reviewed): 3 presets × L/D × 375/768/1440, page overflow 0, axe 0, AA.
- [ ] **Currency (§XXIX), same commit:** `packages/ui/src/CLAUDE.md` (the line-height pairing **Rule** + the canvas-view
      paragraph) · `docs/specs/foundation/fe-codec-canvas-board/s1-canvas-view.md` (title pairs `lineHeight`) ·
      `docs/infrastructure/web-client-runtime/current-spec.md` (S1/S2 notes:
      condense built, defects resolved) · **`slice-map.md` S1 ledger row CORRECTED** (record the false "375
      no-overflow ✓" + this fix — the record, not just the code) · this doc → Status: resolved + Resolution section.

## Change log
| Date | Change |
|------|--------|
| 2026-10-18 | Diagnosed (victor:triage, code-confirmed at index.tsx:43,76-99 + canvas-view.tsx:80; reproduced on Month @ a1148f9). PLAN gate 1 authored. |
| 2026-10-18 | **D-FIX-DEV-1 approved (Victor) → built → Visual Gate PASS (Victor-reviewed: "found everything on the documentation") → RESOLVED.** Mutation-check slip (a `git checkout --` wiped uncommitted canvas-view edits; restored from the pre-mutation copy, re-verified) → memory. |
| 2026-10-18 | **Approval 1 (Victor).** Preflight **PASSED** — assumptions pinned (Breakpoint import path, plain-jsdom harness, Menu API, F3 jsdom observability via the `_lh-` atomic class — probed + probe deleted; px measured at the gate). Gate-2 /critique **REVISE→fixed** (M1: F3 re-verifies the other live CanvasView consumer `CanvasEditor` + the CanvasView stories at the gate — the shared-root-fix precedent; N1: `_lh-` assertion coupling accepted, Brave px authoritative) → **SHIP**. Awaiting Approval 2. |
| 2026-10-18 | **Grounding pass 2 (Victor: "check the documentation, the decisions are in there")** — the 3 questions I'd raised were doc-decided: **(1)** `lg`/48px = the recorded touch-target decision (decisions.md:82, BR-S4-6a) — not a judgment call; **(2)** the line-height defect = a surfaced shared defect → ROOT fix in this flow (decisions.md:1117,1119,1120 precedents) → **F3 added** (CanvasView title pairs `lineHeight="$display"` + the DS convention Rule), mechanism grounded in the installed API (@tamagui/core 2.6.2 Text has no size→lineHeight pairing; no SizableText — ADR-001 core-only), my "separate DS unit + new typography primitive" proposal WITHDRAWN; **(3)** the other 24 sites + the shell/Collection `sm` controls = latent siblings → recorded "sibling fix" (decisions.md:109 precedent), not folded. Re-critique **SHIP** (one contradiction fixed: "no `@vida/ui` change" scoped to the breakpoint; F3 currency targets added). Awaiting Approval 1. |
| 2026-10-18 | **Grounding pass (Victor: "ground everything in the documentation")** — 3 corrections: **(1)** D1 overturned — the apps/web breakpoint contract is Tamagui `useMedia()` + a `__bp` override (regions.ts:66-69, global-bar-1, session-hud), NOT promoting CollectionView's @vida/ui-internal `matchMedia` hook → no `@vida/ui` change; **(2)** D2 added — the binding ≥44×44 touch-target rule (shell-layout §3 / design.md §X) fails on S1's `sm` (32px) controls → the rebuilt controls use `lg` (48); the same gap in the shell + Collection reported as a systemic finding, not fixed here; **(3)** F2 labelled INTERP (the mockup shows only the current week). Re-critique required (material change). |
| 2026-10-18 | gate-1 /critique **REVISE→fixed**: M1 currency step added (incl. correcting the S1 ledger's false PASS) · N1 trigger label `Range: <active>` (Collection convention, no caret glyph) · N2 condensed active-state a11y stated (trigger label + ✓, the Collection precedent). Re-critique SHIP. Awaiting Approval 1. |
