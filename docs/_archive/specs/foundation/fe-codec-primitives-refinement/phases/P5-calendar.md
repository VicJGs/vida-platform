# P5 · calendar-view — editorial month-grid refinement (forward spec)

> **Phase 5** (the FINAL phase) of fe-codec-primitives-refinement (LIF-230). Profile: change-frontend-component ·
> Entity Delivery Flow ②. §XXVI gate artifact (the PLAN). Acceptance oracle = `../mockups/calendar-refinement.html`
> (before → after × 3 presets). Status: **SHIPPED — Approval 2 ✅ · implemented · 21 tests · Visual Gate PASS (brandEmphasis AA fix) · independent review · currency done.**
> **Layer-1 ONLY** — no alive-hook. The living / multi-range calendar is the separate `fe-calendar #19`.

## 0. Source model

Code-first (`frontend-source-of-truth.md`). Tokens / layout-numbers only; **no hard-coded palette** (brand VALUES =
M4/Figma; the ds-2 palette is provisional). All changes are **internal styling of the renderer's own chrome** — NO new
prop, NO interface change, NO behavior change. calendar-view **DOES own its text/chrome** (title · weekday headers ·
day figures · today mark · "+K more") — unlike gallery (P4), these are a real renderer surface, not consumer content.

## 1. Baseline (ground truth — `packages/ui/src/components/calendar-view.tsx`, 205 L)

`CalendarView<T>` is **UI-2 · V4** — a month grid that buckets dated items onto days, **diverging from the linear spine**
(`role="table"`, day cells `role="cell"`, empty = the grid-with-no-chips, NOT a status message). Current chrome:

- **Title** (`:135`): `fontFamily="$display" fontSize="$body" fontWeight="600" color="$colorTextPrimary"`.
- **Weekday headers** (`HeadCell :50` + `:155`): centered (`alignItems:center`); `$caption` `$colorTextMuted` weight 600;
  label = `format(day,'EEE')` ("Mon") — plain, not uppercase, no tracking.
- **Day number** (`:178`): `$caption`, `$colorTextPrimary` in-month / `$colorTextMuted` out-of-month; **non-tabular**.
- **Today** (`TodayBadge :64` + `:171-176`): a **filled 22×22 `$colorBrandPrimary` circle** with `$colorTextInverse` number.
- **Cells** (`Day :51`): `minHeight:84`, `padding:$8`, `borderWidth:0.5 $colorBorderDefault`; a `muted` variant
  (`backgroundColor:$colorSurfaceSecondary`) applied **only** to out-of-month days (`:170 muted={!inMonth}`).
- **"+K more"** (`:190`): `$caption` `$colorTextMuted` — plain.
  `[FACT: calendar-view.tsx:46-205; v4-calendar-view.md CV-1..CV-8]`

**Grounding guards — MUST NOT disturb** (the P5 handoff + v4 spec): the TZ-safe `'YYYY-MM-DD'` keying (NEVER
`new Date(str)` — `:111`), the fixed **42-cell** grid (`:103`), the `role="table"`/`cell` divergence + per-cell
`aria-label` (`:170`), the controlled-`month`/opt-in-nav model, `maxPerDay` + overflow. This phase touches **only**
`styled` hosts + text props. `[FACT: calendar-view.tsx:101-118,133,170; v4 CV-1/CV-2/CV-6]`

**Consumers** (grep): the barrel (`index.ts:63`) + `collection-view.stories.tsx:56` (a demo passing a plain `<Text>`
chip). **No app consumer wires it yet.** → zero interface-break risk; a plain-`Text` chip stays valid.

## 2. The crux (the GV-1/LV-5 content boundary — all renderer-chrome items are doc-resolved)

**calendar-view OWNS (this phase builds — renderer chrome):**

- **L1-a · Month title** → `$display` serif at **`$heading` (24)**, **weight 500 (medium)**, tracking **`$tight`**
  (was `$body`/600, flat). `[oracle: calendar-refinement.html:46,73; FACT: fonts.ts heading:24, medium:500, tight:-0.02]`
- **L1-b · Weekday eyebrow** → the P1/P3 eyebrow recipe: `textTransform:'uppercase'` (**CSS, not JS** — the DOM label
  stays `format(day,'EEE')`="Mon" so the `columnheader` accessible name is SR-correct; the house mechanism
  `list-view.tsx:105`/`timeline.tsx:113`/`pomodoro.tsx:68`), `letterSpacing:0.8` (raw, F1), `$caption`, `$colorTextMuted`,
  weight 600, **left-aligned** (`HeadCell alignItems:flex-start`, was center). `[oracle: :54,74; FACT: HeadCell:50; list-view.tsx:105 textTransform]`
- **L1-c · Tabular day figures + size hierarchy** → day number `$caption` **→ `$small` (14)** + `style={{
fontVariantNumeric:'tabular-nums' }}` (the pomodoro/timeline tabular precedent; columns align). The mockup sizes the
  day number (`.day .num` .82rem ≈ 13) **above** its chrome (`.wk .eyebrow`/`.more` .62/.6rem ≈ 10); our size floor is
  `$caption` (12), so the eyebrow can't shrink to 10 — the faithful way to keep _number > chrome_ is to lift the number
  to `$small` (14) while eyebrow + "+K more" stay `$caption` (12). Out-of-month number stays `$colorTextMuted`.
  `[oracle: calendar-refinement.html:60 (.82rem num) vs :54,:70 (.62/.6rem eyebrow/more); FACT: fonts.ts small:14,caption:12; timeline P3 tabular]`
- **L1-d · Today mark = accent number + short accent underline** (NOT a filled blob). Replace `TodayBadge`/inverse
  text with: the number in `$colorBrandPrimary` weight 600 (tabular), wrapped in a `TodayMark` View that carries a
  **2px `$colorBrandPrimary` bottom border** (`alignSelf:flex-start`, `paddingBottom:2`) → a restrained "moment" mark.
  RN has no `::after`, so the underline is the wrapper's `borderBottomWidth` under the digit (≈ the mock's `1.1em` rule).
  **`TodayMark` MUST carry `className="vida-cal-today"`** (the hook `calendar-view.test.tsx:85` selects + the Visual-Gate
  today-cell selector) — re-home it off the removed `TodayBadge`, don't drop it. `[oracle: :62-64,76-78; FACT: calendar-view.tsx:64-72,171-176; calendar-view.test.tsx:85]`
- **L1-e · "+K more" eyebrow** → uppercase, `letterSpacing` wide, `$colorTextMuted`, weight 600, `$caption`. `[oracle: :70,83]`
- **L1-f · Cell air** → `minHeight:84 → 92`; hairline border unchanged (0.5). `[oracle: :57 min-height:92]`

- **L1-g · Weekend / out-of-month paper — DOC-RESOLVED, not a fork.** The mockup's "What changed" ledger settles this:
  _"Weekend & out-of-month → subtle paper shift (**`$colorSurfaceSecondary` family**) for rhythm"_ (`:152`) + _"out-of-month
  in `faint`"_ (`:150`). The two hex vars `--weekend`/`--oos` in the mockup HTML are rendering convenience; the DESIGN
  INTENT collapses both to our single `$colorSurfaceSecondary` (the ledger header: _"no new palette"_). Our semantic scale
  confirms the mechanism: surface = `primary · secondary · inverse` only (no usable tertiary tint), text = `primary ·
muted` only (no "faint"). So the grounded treatment is:
  - **out-of-month**: `$colorSurfaceSecondary` bg **+ `$colorTextMuted` number** (current behavior — the oos "faint", :150).
  - **weekend-in-month**: `$colorSurfaceSecondary` bg **+ `$colorTextPrimary` number** (the tint reads; the ink number
    marks it as _this month_, vs the muted oos number — the only token-available differentiator).
  - **precedence**: oos > weekend (an out-of-month Saturday is oos-styled).
    Replace the boolean `muted` variant with a `tone: 'weekend' | 'oos'` variant (both → `$colorSurfaceSecondary`); the
    number color is decided at the `Text` (oos → muted, else primary). In-scope for THIS task per
    `fe-calendar/calendar-vision.md §1.1` ("weekend/out-of-month paper shifts" = the month-grid aesthetic layer) + §4
    (RESOLVED: LIF-230 keeps the grid polish; living/multi-range → #19).
    `[oracle: calendar-refinement.html:150,152; FACT: semantic.json surface primary/secondary/inverse + text primary/muted; calendar-vision.md §1.1,§4]`
    **⚠ Visual-Gate check (NOT an Approval decision):** our discrete `$colorSurfaceSecondary` is heavier than the mockup's
    ~1–2%-off whisper hexes, and it washes a large area (a full weekend column + both month-edge fragments). The Gate judges
    **rhythm vs muddy** across the matrix; if muddy, the Gate-REVISE narrows the tint (e.g. oos-only, the current
    gate-passed look) — re-grounded at that point, not pre-decided here.

**CONSUMER OWNS (NOT this phase — composed in `renderItem`, shown in a story so the Gate sees it):**

- The **event chip** (the mock's accent category **dot** + sans caption) is tile/row CONTENT = `renderItem` (the
  GV-1/LV-5 boundary, the P1/P4 honest-scope split). calendar-view renders whatever `renderItem` returns inside a cell.
  The story composes a dotted chip so the look is visible, but it is NOT calendar-view code. `[FACT: v4 CV-5 renderItem; LV-5]`

**OUT OF SCOPE (homed elsewhere):** day/week/agenda views · day-selection + 2D roving · drag-to-reschedule · a richer
<768 stacked layout · **any Layer-2 alive-hook (live "today" ticking, multi-range, event density heat)** → `fe-calendar #19`.
`[FACT: v4 §6 Deferred; P5 handoff "NO Layer-2"]`

## 3. Contract (the diff) — NO interface change

```ts
// CalendarViewProps<T>: UNCHANGED. No new prop. All changes are internal styled-host + Text props.
```

Internal changes only:

- `Day` variant `muted:{true}` → **`tone: { weekend | oos }`** (both → `backgroundColor:$colorSurfaceSecondary`); call
  site computes `tone` from `isWeekend(day) && inMonth` vs `!inMonth` (oos precedence). Day-number color: oos →
  `$colorTextMuted`, else `$colorTextPrimary` (weekend keeps primary). `isWeekend` from `date-fns` (already a dep).
- Remove `TodayBadge` → add `TodayMark` (border-bottom underline wrapper) + accent number (L1-d); **`TodayMark` keeps
  `className="vida-cal-today"`** (test:85 + Gate selector).
- Title (`$heading`/500/tight) / `HeadCell` align / weekday `.toUpperCase()` + tracking / day number `$caption`→`$small`
  - tabular figures / "+K more" eyebrow per §2.
- React-19 ref-prop, `role="table"`/`cell`, TZ-safe keying, 42-cell grid, nav, states — all **untouched**.

## 4. Acceptance

- **Visual Gate (blocking):** Brave, full matrix **3 presets × light/dark** on the storybook October-2026 fixture:
  serif `$heading` title (medium, tight) · UPPERCASE tracked weekday eyebrows (left-set) · tabular day figures align in
  columns · **today = accent number + underline, NOT a blob** · weekend cells tinted with a PRIMARY number, oos cells
  tinted with a MUTED number (3 legible levels) · "+K more" eyebrow · chip dot (story) reads · 42 cells, 7 headers.
- **⚠ The key AA risk (full-matrix, per [[contrast-test-must-be-full-matrix-not-light-only]]):** today's accent **number
  on surface** is a NEW text-contrast case (before = brand FILL + inverse text, AA by construction; now accent-as-text
  needs **≥ 4.5**). Assert `$colorBrandPrimary` on BOTH `$colorSurfacePrimary` AND `$colorSurfaceSecondary` (a weekend/oos
  today) across **all 3 presets × light + dark** — quietDesk olive (light) and the warm-dark readers are the tight
  constraints. Any pair < 4.5 → resolve (not ship). Weekday eyebrow + oos number (`$colorTextMuted` on
  `$colorSurfaceSecondary`) asserted too. axe 0. 375 horizontal-scroll intact (CV-8). Dark mode correct.
- **a11y:** unchanged — `role="table"`/`row`/`columnheader`/`cell`, per-cell `aria-label`, `warnMissingName`,
  `aria-busy` loading. The today mark is **visual-only** (parity with the shipped blob — today is not SR-announced
  today; adding "Today," to the cell `aria-label` is a noted **non-regression deferral**, not this Layer-1 phase).
- **Tests (jsdom):** today cell renders the accent-number + underline mark (NOT `TodayBadge`); weekend-in-month cell gets
  `tone=weekend` (secondary bg, primary number); oos cell `tone=oos` (secondary bg, muted number); oos precedence over
  weekend; **weekday DOM text stays "Mon"** (uppercase is CSS `textTransform`, Visual-Gate-verified — jsdom can't compute
  it, and the `columnheader` name must stay SR-correct); day figures carry `tabular-nums`; the existing 14 calendar-view tests stay green
  (grid shape, TZ bucketing, nav, states, `role="cell"`). `@vida/ui` suite green; tsc 0; eslint 0.
- **§XXIX currency:** `packages/ui/src/CLAUDE.md` (calendar-view paragraph: P5 refinement note) + `v4-calendar-view.md`
  change-log row.

## 4a. Preflight (to run at gate-2 — grounded checks)

- **F1 · RESOLVED** — `tamagui.config.ts:20,30,31` `sizeScale`/`weightScale`/`trackScale` = `{...f.*, true}`. `$heading`
  (24)/`$small` (14)/`$caption` (12) resolve; `fontWeight="500"` passes through (the current `"600"` proves raw numeric).
  **⚠ Tracking = RAW numbers, NOT the tokens** — `trackScale` wires `$wide:0.02`/`$tight:-0.02` (design.md ratios,
  ~invisible as px); the shipped house eyebrows use raw `letterSpacing:0.8` (`list-view.tsx:106`, `timeline.tsx:114`). So
  weekday eyebrow + "+K more" = **`letterSpacing:0.8`**; title tightening = raw **`-0.3`** (≈ mockup -.01em @ 24px).
  `[FACT: tamagui.config.ts:20,30,31; list-view.tsx:106; timeline.tsx:114 — raw, not $wide]`
- **F2 · RESOLVED-with-gate-residual** — accent-as-text-on-surface already ships + passed the gate: Button `intent="ghost"`
  `textGhost:$colorBrandPrimary` (`themes.ts light_Button`), and calendar-view's own nav chevrons ARE ghost buttons → the
  today number inherits that confidence on `$colorSurfacePrimary`. Residual = accent-on-`$colorSurfaceSecondary` (a
  weekend/oos today), which ghost buttons don't exercise → the §4 full-matrix gate verifies it; quietDesk-light olive +
  warm-dark are the tight cells. `[FACT: themes.ts light_Button textGhost; calendar-view.tsx:140-144 ghost nav]`
- **F3 · `isWeekend` is TZ-safe** — `isWeekend(day)` reads local `getDay()` on the grid `Date` (built via `addDays` from
  `startOfWeek`, local) — no UTC round-trip, consistent with CV-1. Weekend = Sat/Sun regardless of `weekStartsOn`.
- **F4 · `fontVariantNumeric` forwards** — Tamagui forwards the `style` key (the pomodoro P1 gate-verified precedent).
- **F5 · underline mechanism** — `borderBottomWidth:2` on a `flex-start` wrapper under the digit renders the short rule
  (no `::after` in RN); verify width ≈ digit, no full-cell underline.

## 4b. Grounding ledger (code + docs verified — No-Guessing, 2026-10-07)

- **Weekend/oos = DOC-RESOLVED (not a fork):** `calendar-refinement.html:152` "`$colorSurfaceSecondary` family" + `:150`
  "out-of-month in faint" + header "no new palette" → both cells = `$colorSurfaceSecondary`, differentiated by number
  color. `semantic.json` surface = `primary/secondary/inverse`, text = `primary/muted` (no tertiary/faint). In-scope per
  `calendar-vision.md §1.1,§4`. `themes/CLAUDE.md` — palette VALUES provisional, swap at M4/Figma.
- **`vida-cal-today` is a live test hook:** `calendar-view.test.tsx:85` `querySelector('.vida-cal-today')` → `TodayMark` must keep it.
- **Font scale:** `fonts.ts:6-8` — `heading:24`, `caption:12`, `body:16`; `fontWeight.medium:500/semibold:600`;
  `letterSpacing.tight:-0.02/wide:0.02`.
- **Eyebrow recipe precedent:** P1 `SectionHeader` + P3 `getEyebrow` (uppercase + wide tracking + muted) — CLAUDE.md list/timeline.
- **Tabular precedent:** pomodoro P1 (`fontVariantNumeric:'tabular-nums'` on `Time`, gate-forwarded) + timeline P3 dates.
- **Accent-as-moment precedent (not a blob):** the mock's today underline mirrors P3's hollow-dot / present-accent restraint.
- **Chip = consumer (not renderer):** `v4-calendar-view.md:91 renderItem` + LV-5; the P1/P4 honest-scope split.
- **`date-fns` already a dep** (`isWeekend` is a barrel import, consumer-shaken) — v4 CV-7.
- **No foundation spec mandates a today-BLOB** — grep-clean; v4 CV-7 says "today marker `$colorBrandPrimary`", the FORM
  (fill vs text+underline) is the aesthetic refinement's to set; the mockup is the authority for this refinement.

## 5. Implementation prompt

Edit `packages/ui/src/components/calendar-view.tsx` only (+ `.test.tsx` + `.stories.tsx` + currency). (1) Title `Text` →
`fontSize="$heading" fontWeight="500"` + tracking (F1). (2) `HeadCell` → `alignItems:'flex-start'`; weekday `Text` →
`textTransform:'uppercase'` (CSS — keep DOM label `format(day,'EEE')`, F-gate2) + `letterSpacing:0.8` (raw, F1), stays
`$caption`. (3) Day-number `Text` → `fontSize="$small"` +
`style={{fontVariantNumeric:'tabular-nums'}}` (number outranks the `$caption` eyebrow/chrome — L1-c). (4) Replace
`TodayBadge`/inverse branch with a `TodayMark` styled View (`className="vida-cal-today"`, `alignSelf:'flex-start'`,
`borderBottomWidth:2`, `borderBottomColor:'$colorBrandPrimary'`, `paddingBottom:2`) wrapping a `$colorBrandPrimary`
weight-600 `$small` tabular number. (5) `Day` variant `muted` → `tone:{weekend,oos}` (both `$colorSurfaceSecondary`);
call site: `tone = !inMonth ? 'oos' : isWeekend(day) ? 'weekend' : undefined`; number color = `!inMonth ?
'$colorTextMuted' : '$colorTextPrimary'`. (6) `minHeight:84→92`. (7) "+K more" `Text` → uppercase + wide tracking +
weight 600, `letterSpacing:0.8`, stays `$caption`. Title gets `letterSpacing:-0.3` (F1). Keep grid/keying/roles/nav/states. Add a story chip with an accent dot (consumer-composed,
documented NOT-renderer). Update tests + CLAUDE.md + change-log.

## 6. Change Log

| Date       | Session                             | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-07 | fe-codec-primitives-refinement (P5) | Forward spec authored at PLAN — Layer-1 editorial refinement (serif `$heading` title · uppercase tracked weekday eyebrows · `$small` tabular day figures · today = accent number + underline not a blob · weekend/oos `$colorSurfaceSecondary` paper · "+K more" eyebrow). NO interface change, NO Layer-2 (→ fe-calendar #19). Chip dot = consumer (LV-5).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-10-07 | fe-codec-primitives-refinement (P5) | gate-1 /critique **REVISE→fixed** + **regrounded** (Victor "ground it in the docs"): (1) the weekend/oos "fork" was DOC-RESOLVED all along — `calendar-refinement.html:150,152` ("`$colorSurfaceSecondary` family" + oos faint, "no new palette") already specifies both→secondary differentiated by number color; reframed from an Approval-1 fork to a stated fact + a Visual-Gate rhythm-vs-muddy check; scope confirmed in-task via `calendar-vision.md §1.1,§4`. (2) day number `$caption`→`$small` so it outranks the `$caption` eyebrow (mockup `.num` .82rem > `.eyebrow` .62rem). (3) `TodayMark` MUST keep `className="vida-cal-today"` (`calendar-view.test.tsx:85` selects it). Today accent-number-on-surface AA = the full-matrix gate risk.                                                                                                                                                                                                                                              |
| 2026-10-07 | fe-codec-primitives-refinement (P5) | **Approval 1 ✅.** Preflight F1–F5 resolved: F1 tracking = RAW `letterSpacing:0.8` eyebrows / `-0.3` title (the `$wide:0.02`/`$tight:-0.02` tokens are near-invisible px; house precedent `list-view.tsx:106`/`timeline.tsx:114` is raw) · F2 today-AA de-risked by the shipped ghost-button `textGhost:$colorBrandPrimary` precedent (+ calendar's own ghost nav), residual = accent-on-secondary → gate · F3 `isWeekend` TZ-safe · F4/F5 tabular+underline precedented. gate-2 /critique **SHIP after one REVISE**: weekday uppercase must be CSS `textTransform` (DOM stays "Mon" — SR-correct `columnheader` name), NOT `.toUpperCase()` (the house mechanism).                                                                                                                                                                                                                                                                                                                                     |
| 2026-10-07 | fe-codec-primitives-refinement (P5) | **Approval 2 ✅ · SHIPPED.** Implemented in `calendar-view.tsx` (title/weekday/figures/today/tone/+more) + 7 new tests (21 total, Tamagui atomic-class assertions for tone/colour + inline `fontVariantNumeric`) + `TodayOnWeekend` story (exercises brand-number-on-secondary) + gate classNames. tsc 0 · eslint 0 · @vida/ui **437** green. **Blocking Visual Gate caught the flagged residual:** `$colorBrandPrimary` today number fell to **4.39 (editorial/dark) + 4.44 (quietDesk/light) < 4.5 AA** on a weekend/oos `$colorSurfaceSecondary` cell → fixed to **`$colorBrandEmphasis`** (the higher-contrast brand step, both modes; no new palette) → re-gate **PASS** (today 5.93–8.89 on paper+secondary · weekday 4.94–6.53 · day-number MIN 4.52–5.22 · serif title 15.84–17.29 · axe 0 · 42 cells · 375 no-overflow, all 12 cells). Independent code-review + §XXIX currency (CLAUDE.md + v4 change-log) done. **P5 = the FINAL primitives-refinement phase; LIF-230 complete after this.** |
