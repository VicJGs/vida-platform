# P1 · pomodoro-widget — aesthetic refinement + progress-ring (forward spec)

> **Phase 1** of fe-codec-controls-refinement (LIF-231). Profile: change-frontend-component · Entity Delivery Flow ②.
> §XXVI gate artifact (the PLAN). Acceptance oracle = the **blocking Visual Gate** (Brave, 3 presets × light/dark).
> Status: **gate-1 REVISE→folded → Approval 1 ✅ → preflight PASSED (§4b) → gate-2 REVISE→folded → Approval 2 ✅ →
> IMPLEMENTED → Visual Gate PASS → code-review + pre-ship /critique → DONE.** tsc 0 · @vida/ui 411 tests · eslint 0.
> Visual Gate: Brave, 3 presets × light/dark — tabular `tabular-nums` all cells · eyebrow uppercase all cells · ring
> accent flips per preset+mode (editorial `rgb(37,99,235)` / reader oxblood `rgb(178,55,51)` / quietDesk olive
> `rgb(95,110,62)`) · AA worst 4.94, 0 fails incl. warm-dark · axe 0 · 375 no-overflow. Gate script: `/tmp/vg/pomo-gate.mjs`.

## 0. Source model
Code-first (frontend-source-of-truth.md). Tokens/variants + a local SVG primitive only; **no hard-coded palette**
(brand values = M4/Figma). No palette-VALUE churn — structure/shape/figures/elevation only.

## 1. Baseline (ground truth — `packages/ui/src/components/pomodoro-widget.tsx`)
`PomodoroWidget` is **UI-2 · V5**, the interactive timer widget (`role="timer"`, ADR-008:35). Drift-free countdown
from an `endAtRef` timestamp; the `setInterval` is armed imperatively in `run()`; the ~250ms tick reads `endAtRef` +
the stable `setRemainingMs` (NO effect deps on countdown state). `status` is state+`statusRef` via one `setStatus`;
`onComplete` one-way-latched. Controls swap by status. [FACT: pomodoro-widget.tsx:66-232]

**Current presentation (the refinement surface):**
- `Root` — a card: `padding $24`, 1px `$colorBorderDefault`, `$lg` radius, `$colorSurfacePrimary`; **resting shadow NOT
  applied** (plain border). [FACT: pomodoro-widget.tsx:48-57]
- `PhaseLabel` — `$body`/`$small`/`$colorTextMuted`/`textTransform:capitalize`. [FACT: :58]
- `Time` — `$display`/`$display`(36px)/`weight 600`/`$colorTextPrimary` — **proportional figures → jitters every tick**
  (serif faces: Spectral/Newsreader/Fraunces). [FACT: :60, themes/fonts.ts]
- `Track`/`Fill` — a full-width 8px bar; `Fill` width = `${progress*100}%` via inline `style`, **stepped per tick (NO
  CSS transition)**. [FACT: :61-62, :196]
- `Complete` — `$body`/`$small`/`weight 600`/`$colorBrandPrimary` in a `role="status"`. [FACT: :64, :229]

**Conformance (audit): already clean** — 0 hard-coded colors; no CSS animation (so no reduced-motion gap); state-as-prop
(status drives controls). So P1 is **pure aesthetic + one opt-in capability**, no conformance fix.

## 2. The crux (the /contract boundary)
Two layers, both presentational, both owned by the widget (no cross-module read → no split):

**Layer 1 — aesthetic polish (NO API change):**
- **L1a · tabular figures on `Time`** (the headline fix): `style={{ fontVariantNumeric: 'tabular-nums' }}` so each digit
  occupies a fixed advance and the countdown stops jittering. **Mechanism = the minimal grounded one:** a static style
  on the DOM text, NOT injected CSS (the CLAUDE.md rule reserves injected CSS for pseudo-state styled() can't see; this
  is static numeric styling) and NOT a new shared file (one consumer — extract only at the rule of three, the
  `internal/data-view` precedent). **Documented as a convention** in CLAUDE.md for future numeric UI (Select numeric
  options, timeline dates, table cells) to adopt.
- **L1b · eyebrow phase label**: `PhaseLabel` → eyebrow treatment — `$caption`, `textTransform:'uppercase'`,
  `letterSpacing:'$wide'`, `$colorTextMuted` (the views-pass approved vocabulary; replaces plain capitalize).
- **L1c · refined track**: thinner **hairline rhythm** — `Track` height `8→6`, `Fill` keeps `$colorBrandPrimary`
  (accent-as-moment); unchanged stepping behavior. (Only when `progress='bar'`.)
- **L1d · softer/intentional elevation**: apply the **resting card elevation** the DS already ships
  (`card-styles.ts` shadow→opacity model, reading `shadow.ts`) via the existing elevation convention — the widget is a
  raised object, not a flat bordered box. Self-cancels in dark (border carries dark elevation), per the Card precedent
  [FACT: CLAUDE.md Card]. **No new shadow values.**

**Layer 2 — opt-in capability (CONTRACT change → /contract):**
- **L2 · `progress?: 'bar' | 'ring'`** (default **`'bar'`** → non-breaking). `'ring'` renders the countdown inside a
  **circular progress ring** instead of the linear bar (the canonical pomodoro form). Opt-in variant per §VII
  (composition over a breaking swap); existing consumers keep the bar untouched.
  - **§VI note (why a variant enum, not a slot):** `components.md §VI` reserves *composition/slots* for **consumer-facing
    layout** variation. The progress indicator is **widget-INTERNAL** — the consumer never composes it (no `header`/`footer`
    analogue); it's a rendering-MODE of an element the widget owns, so `progress` is a semantic variant like `size`/`intent`,
    NOT the layout-via-enum anti-pattern §VI forbids. [grounded: the widget renders Track/Fill itself, pomodoro-widget.tsx:195-197]

## 3. Contract (exact diff to `PomodoroWidgetProps`) — PREFLIGHT-GROUNDED
```
+ progress?: 'bar' | 'ring'   // progress indicator form. Default 'bar' (non-breaking). 'ring' = circular track around
+                             //   the Time; 'bar' = the current linear track. Pure presentation; same stepped update.
```
No other prop changes. Layer-1 is internal (styled-host + inline-style edits), zero API surface.

**Ring rendering (grounded):** a local `<svg>` with two `<circle>`s (track + progress) — progress circle
`strokeDasharray=C`, `strokeDashoffset=C*(1-progress)`, `C=2πr`; `strokeLinecap:'round'`, rotated `-90deg` so fill
starts at 12 o'clock. **⚠ Colors via `useTheme()` RESOLVED values, NOT `$token` strings, NOT hard-coded hex (gate-2
blocker).** An SVG `stroke` attr can't consume a Tamagui `$token` (not a CSS value → colorless ring); a hard-coded hex
would **reintroduce the exact Neural-Graph conformance violation this task exists to fix** (NG hard-codes `#6366f1`
*because* WebGL can't take tokens — SVG has the identical constraint). So `const theme = useTheme()` →
`stroke={theme.colorBrandPrimary?.get('web')}` (progress) / `theme.colorSurfaceSecondary?.get('web')` (track) — stays
**preset- and theme-aware AND token-pure** (re-reads on theme/preset change via the hook). **`.get('web')` is the
Tamagui-DOCUMENTED call for SVG** [FACT: @tamagui/web 2.6.2 getThemeProxied.d.ts — ThemeGettable.get JSDoc: "For things
like SVG, gradients… use this option" with platform='web']. **Stepped per tick
(React value update, NO CSS transition)** — identical update model to the bar, so **no motion-standard / reduced-motion
concern** (dashoffset is never CSS-transitioned). The `Time` sits centered inside the ring (absolute-centered). SVG is
web/RNW-rendered — **native seam**: RN would need `react-native-svg`; mobile isn't built (ADR-001 "when mobile is
built") and mobile renders charts/graphs via WebView anyway → documented native follow-up, not an M1 blocker.
`aria-hidden` on the `<svg>` (the `role="timer"` + live `mm:ss` text already announce progress; the ring is decorative).

## 4. Acceptance
- **Visual Gate (blocking):** Brave, **3 presets (editorial · reader · quietDesk) × light/dark**. Assert, in BOTH
  `progress` modes:
  - **tabular figures** — the `mm:ss` digits hold a fixed advance across a simulated countdown (`25:00 → 09:59 → 00:00`,
    no horizontal reflow of the Time);
  - **eyebrow phase** — uppercase/tracked/caption, correct muted token;
  - **ALL 4 statuses × BOTH progress forms (§VIII all-states):** **idle** (progress 0 → empty ring / 0-width bar, Start
    control) · **running** (mid arc/fill, Pause+Skip) · **paused** (frozen arc/fill at the held %, Resume+Reset+Skip) ·
    **complete** (0 remaining → full/0 per the latch + the `role="status"` "focus complete" one-shot). Ring at a known %
    (e.g. 40% → offset≈0.6·C), track token, round cap, starts at 12 o'clock; bar = 6px hairline accent fill at the same %;
  - **ring accent FLIPS with preset + mode** (reader oxblood / quietDesk olive / dark) — proves `useTheme()`-resolved,
    NOT a frozen hex (the gate-2 anti-regression check);
  - **elevation** — resting raised shadow in light; border-carried elevation in dark (no shadow bleed);
  - **full-matrix AA** on every text pair incl. warm-dark (muted phase label + accent Time ≥ 4.5 / ≥ 3 for large);
  - **375** no-overflow (ring fits; controls wrap). **Breakpoint-invariant:** the widget has a fixed intrinsic size and
    does NOT reflow by breakpoint (no `$media` branch) → 375 is the binding case; 768/1440 render identically (stated per
    §X rather than tested redundantly).
- **a11y:** `role="timer"` + `mm:ss` unchanged; the completion `role="status"` one-shot unchanged; `<svg>` `aria-hidden`;
  the ring adds **no** new interactive node. axe 0 across both modes.
- **Tests:** `progress='ring'` renders the svg + a progress circle whose `strokeDashoffset` tracks `remainingMs`
  (fake-timer tick → offset moves); `progress='bar'` (default) renders the existing track; **both forms render across
  idle/running/paused/complete** (status-driven, via the existing control-swap assertions); tabular style present on
  `Time`; all existing pomodoro tests green (timer/latch/controls untouched). `@vida/ui` suite green; tsc 0; eslint 0.
- **§XXIX currency:** `packages/ui/src/CLAUDE.md` (pomodoro paragraph: +`progress` variant, tabular-figures convention
  note) + `docs/specs/components/ui-2-platform-views/v5-pomodoro-widget.md`.

## 4b. Preflight RESULT (2026-10-06 — PASSED, grounded in code + v5 durable spec)
**Two doc-grounding finds (strengthen the spec — P1 realizes documented v5 intents, invents nothing):**
- **L1a tabular = a spec'd-but-UNBUILT invariant.** `v5-pomodoro-widget.md §4:144` specifies `Time (… tabular; …)`;
  the shipped `pomodoro-widget.tsx:60` omits it. L1a **completes** it (conformance, not just polish).
- **L2 ring = v5's DOCUMENTED deferred item.** `v5 §6 Deferred: "a progress RING (SVG/conic — a nicer visual than the
  V5 linear bar)"`. Realized here as an **opt-in variant** so v5 §1's "linear bar for V5" exclusion stays true for
  existing consumers. No scope violation.

**Verify items resolved:**
- **V1 RESOLVED** — inline `style={{ fontVariantNumeric:'tabular-nums' }}` on `Time` (the `Fill style={{width}}`
  passthrough precedent [FACT: pomodoro-widget.tsx:196]); Visual Gate = the oracle (fixed digit advance across the
  countdown); fallback = `className` + a one-line `ensureNumericStyles()` if Tamagui drops the key. No new file unless needed.
- **V2 RESOLVED** — raw `<svg>`/`<circle>` render as native React DOM inside the styled(View→div) on web; **no new dep**
  (PW-7 preserved). A thin local `ProgressRing` function in the file (no new file, the `SkeletonRow`-local precedent).
- **V3 RESOLVED** — ring `size 120`, `r 56`, `strokeWidth 8` = **layout numbers**, not tokens (the `gallery tileStyle` /
  `tabs indicatorStyle` precedent [FACT: CLAUDE.md gallery/tabs]); fits inside Root `padding $24` at 375.
- **V4 RESOLVED** — `Root` gets `style={{ boxShadow: shadow.resting }}` from `themes/shadow.ts` (the Card resting-shadow
  value; self-cancels dark → border carries elevation, no theme detection [FACT: card-styles.ts:8-11]); no new value/file.
- **V5 RESOLVED** — no documented invariant violated (base tokens, no sub-theme, no new dep, dimension-as-layout-number
  all preserved; stepped-no-transition = PW-5).

## 4a. Preflight + /verify items (resolved above in §4b)
- **V1 — `fontVariantNumeric` passthrough:** confirm `@tamagui/core` `styled(Text)` forwards `style` to the DOM so
  `fontVariantNumeric:'tabular-nums'` lands (expected: yes — web renders a DOM `<span>`). Fallback if not: a `className`
  + a one-line `internal/numeric-styles.ts` (`ensureNumericStyles()`, the `ensureToastStyles` pattern). Prefer the style
  prop (no new file).
- **V2 — raw `<svg>` inside a Tamagui tree (web):** confirm `<svg>`/`<circle>` render under `@tamagui/core` on web
  (expected: yes — plain React DOM). Keep it a thin local `ProgressRing` function in the file (no new dep, no new file).
- **V3 — ring geometry:** pick `r`/`strokeWidth` so the ring reads at 375 (e.g. `size 128`, `r 56`, `strokeWidth 8`);
  Time `$display` fits centered. Confirm at the Visual Gate.
- **V4 — elevation hook:** confirm the resting-shadow convention is reusable on a non-Card host (reuse `card-styles.ts`
  model or the `shadow.ts` token directly); if it's Card-coupled, apply the `shadow.ts` resting value inline (no new
  value). Grounded at implement.
- **V5 — durable-invariant confirm:** read `docs/specs/components/ui-2-platform-views/v5-pomodoro-widget.md` and confirm
  the ring/svg + tabular style violate NO documented invariant (expected clean: keeps base tokens, no sub-theme, **no new
  dep** — `<svg>` is native DOM; the `progress` default preserves the current render). A contradiction = a blocker to
  resolve before Approval 2.

## 5. Implementation prompt
Types-first: add `progress?: 'bar' | 'ring'` to `PomodoroWidgetProps` (default `'bar'`). (1) **L1a** `Time` → add
`style={{ fontVariantNumeric: 'tabular-nums' }}` (or the V1 fallback). (2) **L1b** retune `PhaseLabel` to the eyebrow
(caption/upper/tracked). (3) **L1c** `Track` height 6; keep the inline-width `Fill`. (4) **L1d** apply the resting
elevation (V4). (5) **L2** add a local `ProgressRing({ progress, size, children })` (thin `<svg>` two-circle, `aria-hidden`,
**colors via `useTheme()` resolved values — `theme.colorBrandPrimary?.get('web')` / `theme.colorSurfaceSecondary?.get()`,
NEVER a `$token` SVG attr (colorless) NOR a hard-coded hex (the NG conformance violation)**, round cap, −90° start);
when `progress==='ring'` render `<ProgressRing>`
wrapping the centered `Time` in place of the `Track`; else the bar. Keep the timer/latch/controls logic **untouched**
(no change to run/arm/tick/setStatus). Update `.stories.tsx`: bar + ring × the Visual-Gate cells (+ a countdown story for
the tabular check). Update tests + §XXIX currency. Any divergence from this plan → §XXVIII.
