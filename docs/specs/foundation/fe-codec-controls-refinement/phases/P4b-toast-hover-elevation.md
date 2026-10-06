# P4b · Toast — hover "slight elevation" (forward spec)

> **Phase 4 BUILD slice** (the one non-RATIFY atom) of fe-codec-controls-refinement (LIF-231). change-frontend-component.
> §XXVI gate artifact. The other 5 atoms RATIFY (P4-atoms-ratify.md §1a/§1c). Victor pre-approved: build now · Card
> overlay-opacity mechanism. Status: **gate-1 /critique REVISE→folded (shadow self-cancels in dark → add a Card-style
> border-strengthen hoverStyle so §VIII hover is perceivable in BOTH modes; wrapper pointerEvents NIT) → Approval 1 ✅
> (pre-approved: build + Card mechanism) → preflight PASSED (§4b) → gate-2 SHIP → Approval 2 ✅ → IMPLEMENTED →
> Visual Gate PASS → DONE.** tsc 0 · @vida/ui 413 tests · eslint 0. Visual Gate: Brave, 3 presets × light/dark — elevation
> overlay opacity 0→1 on hover ALL cells (shadow.raised fades in) · dark border-strengthens (§VIII perceptibility) ·
> reads "slight" (screenshot-confirmed: hovered toast lifts, resting toasts flat). Gate script `/tmp/vg/toast-gate.mjs`.

## 0. Source model
Code-first. No palette churn; reuse `shadow.ts`. The deliverable = a contract-MISSING state (not a new feature).

## 1. Baseline + the gap (ground truth)
`toast.md:27` Visual-States contract: **hover → "auto-dismiss timer pauses; slight elevation | overlay opacity".** The
shipped Toast delivers ONLY the functional pause (`onMouseEnter={pause}`, toast.tsx:199) — **no visual elevation**
[FACT: ToastPanel styled def has no hover/shadow, toast.tsx:94-110]. So the "slight elevation (overlay opacity)" half of
the contract is MISSING. This slice delivers it.

## 2. The crux — the Card overlay-opacity mechanism, past the `overflow:hidden` clip
The contract says the elevation is communicated via **overlay opacity** → the **Card elevation precedent**
(`card-styles.ts`: a raised-shadow overlay child, `opacity:0` resting → `opacity:1` on hover, transition OPACITY only —
B12-safe; never an animated box-shadow). **⚠ Direct copy fails:** `ToastPanel` has `overflow:hidden` (clips the 3px
accent bar to the radius, toast.tsx:108) — a shadow on an overlay CHILD would be clipped. **Resolution (Victor's "move
the shadow to a wrapper"):**
- Wrap the panel in a **`ToastWrapper`** (`position:relative`, **NO `overflow`**, `className="vida-toast-wrap"`).
- Inside it, a sibling **`ToastElevation`** overlay: `position:absolute; inset:0; borderRadius:$lg` (match the panel);
  the box-shadow (raised) + `opacity:0`; `pointerEvents:none`; `aria-hidden`.
- Keep **`ToastPanel` exactly as-is** (its `overflow:hidden` still clips the accent bar). The opaque panel
  (`$colorSurfacePrimary`) sits over the overlay → covers the overlay's body; only the overlay's drop-SHADOW paints,
  OUTSIDE the panel, UN-clipped (the wrapper has no overflow).
- `.vida-toast-wrap:hover .vida-toast-elevation { opacity: 1 }` → the hover elevation (matches the `onMouseEnter` pause
  region). Transition `opacity` only (B12); reduced-motion `@media` → instant (the `card-styles.ts` precedent).

**Shadow level:** "slight" elevation → `shadow.raised` (Level 2) revealed on hover (the toast rests flat per its
contract's default row; hover lifts it a step — the Card resting→raised semantics, scaled to a notification). NOT
`shadow.overlay` (that's the Level-3 resting the P3 panels carry; a toast is lighter). Confirm "slight" at the gate (V1).

**⚠ Dark-mode perceptibility (gate-1 fix — §VIII "hover must be perceivable").** `shadow.raised`'s hue = the dark
surface → in DARK the fading-in shadow **self-cancels** (the §XI blend) → the hover elevation would be ~invisible, so
the hover state has NO perceptible change in dark. **The Card already solved this** [FACT: card-styles.ts note — "The
dark hover cue (an instant border strengthen) is a `hoverStyle` VARIANT on the frame, NOT here [the shadow]"]. Mirror
it: add a subtle **`hoverStyle` border-strengthen** on `ToastPanel` (`borderColor` → a stronger token, e.g.
`$colorBorderStrong` if present else `$colorTextMuted`-weight). **Light** = the shadow lift carries the elevation;
**dark** = the border-strengthen carries perceptibility (shadow vanished). Both modes perceivable. (Instant border swap
= B12-safe, the Tabs/Card precedent.)

## 3. Contract
No `ToastOptions`/`ToastProvider` prop change. Internal: a wrapper element + an elevation overlay + a toast-styles rule.
Non-breaking (the pause/focus/accent/motion/live-region behavior is UNTOUCHED).

## 4. Acceptance
- **Visual Gate (blocking):** Brave, 3 presets × light/dark. Hover a toast → a **slight elevation appears** (the overlay
  shadow fades in, measured: `.vida-toast-elevation` computed `opacity` 0→1 on `:hover`); un-hover → fades out. The
  shadow is NOT clipped (paints outside the panel). **Dark-cell perceptibility (gate-1 fix):** in DARK the hover produces
  a **perceptible change** via the `ToastPanel` border-strengthen (computed `borderColor` differs on `:hover`), since the
  shadow self-cancels — assert both the light shadow-fade AND the dark border-change. Reduced-motion → the elevation is
  instant (no fade). The accent bar + text + AA are unchanged; the elevation is behind the opaque panel (no text-contrast
  effect). axe 0. 375 unaffected.
- **Behaviour UNCHANGED:** timer pause-on-hover/resume, F6 focus, Esc dismiss, the accent bar, enter/exit motion, the
  live regions — all intact (the wrapper + overlay are presentational siblings). All existing toast tests green + 1 new:
  the elevation overlay renders (`.vida-toast-elevation` present, `aria-hidden`). `@vida/ui` suite green; tsc 0; eslint 0.
- **§XXIX:** CLAUDE.md Toast paragraph (+hover elevation) + `toast.md` change log (contract state now delivered).

## 4b. Preflight RESULT (2026-10-06 — PASSED, grounded)
- **V4 RESOLVED — border-strengthen = `$colorTextMuted` (the Card precedent).** No `$colorBorderStrong` exists; the only
  border token is `$colorBorderDefault` [FACT: themes.ts]. Card's dark-hover cue is `hoverStyle:{ borderColor:'$colorTextMuted' }`
  [FACT: card.tsx:52] — strengthen `$colorBorderDefault`→`$colorTextMuted` (preset-aware, direct semantic, no hard-coded).
  Toast's panel starts at `$colorBorderDefault` (toast.tsx:106) → mirror Card 1:1.
- **V1** shadow.raised (Level 2) on hover — confirm "slight" at gate. **V2** wrapper = tight box, default pointerEvents
  (needs `:hover`), handlers/nodeRef stay on PANEL. **V3** overlay behind opaque panel, shadow paints outside (un-clipped).

## 4a. Preflight + /verify (resolved above in §4b)
- **V1 — shadow level ("slight"):** `shadow.raised` vs `shadow.overlay` on hover — confirm "slight" reads right at the
  gate (lean `raised`; a toast is a lighter surface than a modal).
- **V2 — wrapper doesn't disturb the stack:** the Toast viewport is a flex column of items; the wrapper must size to the
  panel + not change gap/placement. Confirm the wrapper is a transparent tight box (no padding/bg), `nodeRef` stays on
  the PANEL (F6), `onMouseEnter/Leave` stay on the PANEL.
- **V3 — overlay z/footprint:** the overlay `inset:0` in the wrapper = panel footprint; panel opaque covers it; the
  shadow shows outside. Confirm the overlay sits BEHIND the panel (DOM order / no z needed — panel opaque).
- **V4 — border-strengthen token (dark-hover cue):** confirm a stronger-border semantic token exists for the `hoverStyle`
  (`$colorBorderStrong`? else the Card's dark-hover token). Ground it in `themes.ts` at preflight; it must be preset-aware
  (direct semantic), no hard-coded value.

## 5. Implementation prompt
In `toast.tsx`: add a `ToastWrapper` (styled View, `position:relative`, `className="vida-toast-wrap"` — **default
pointerEvents (NOT none — it needs `:hover`); a tight box, no padding/bg, so it eats no clicks**) around the existing
`ToastPanel` in `ToastItem`'s return; add a `ToastElevation` (styled View, `position:absolute`, `inset:0`,
`borderRadius:'$lg'`, `opacity:0`, `pointerEvents:'none'`, `className="vida-toast-elevation"`, `aria-hidden`) as its
first child. **Add a `hoverStyle:{ borderColor: <stronger token> }` to `ToastPanel`** (the dark-perceptibility cue;
confirm the token at preflight V4). Keep `nodeRef`, `onMouseEnter/Leave/Focus/Blur/KeyDown` on the PANEL. In `internal/toast-styles.ts`:
`import { shadow }`; add `.vida-toast-elevation{box-shadow:${shadow.raised};transition:opacity <fast>}` +
`.vida-toast-wrap:hover .vida-toast-elevation{opacity:1}` + `@media (prefers-reduced-motion:reduce){.vida-toast-elevation{transition:none}}`.
Update `.stories` if needed (hover is gate-driven), tests (+elevation present), §XXIX currency. Divergence → §XXVIII.
