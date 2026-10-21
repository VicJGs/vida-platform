<!-- PLAN — fe-session-hud S2 (the HUD pill) · §XXVI forward spec. Authority: delivery docs (Approval 1)
     + the APPROVED greybox (envision.md). Builds over S1 (d5d6f46). -->

# PLAN S2 — The Session HUD pill

## §1 Context
The render slice: `session-hud.tsx` renders a `HudRead` as the strip pill — the approved greybox made real
over S1's clock + source. Blocking component Visual Gate closes it. S3 mounts it in the shell.

## §2 Business rules (BR-HUD-S2-*)
- **BR-HUD-S2-1** `hidden` renders null — NOTHING in the strip (M1 prod).
- **BR-HUD-S2-2** `idle` = the invitation: hollow ring + "Begin a session" (≥tablet; mobile = ring glyph
  only) (EC-2; `?sample`-only in M1 per Envision answer 1). **(g1 fold)** In M1 idle is PRESENTATIONAL —
  no link/button (a begin-affordance with no start flow would be a dead interactive control, the
  honest-affordance rule); the interactive begin-link ships with the live idle-visible path (#34). The
  Visual Gate judges the FORM.
- **BR-HUD-S2-3** `active` = ring + tabular time, plus (≥tablet) the PHASE eyebrow + truncated title
  (EC-3/EC-3d/EC-6). Eyebrow text: frozen → `PAUSED` · complete → `<PHASE> · DONE` · countdown → the phase
  label (`FOCUS`/`BREAK`) · elapsed → `kindLabel` uppercased.
- **BR-HUD-S2-4** The ring: hairline track (`var(--colorBorderDefault)`), arc `var(--colorBrandPrimary)`
  (the preset-aware SVG `stroke="var()"` precedent); frozen → arc `var(--colorTextMuted)`; complete → full
  arc; elapsed → ring-as-glyph (no arc, BR-HUD-S1-9); idle → hollow. 18px, aria-hidden.
- **BR-HUD-S2-5** Frozen ink falls to muted TOKENS (`$colorTextMuted` on the time), never opacity on text (EC-4).
- **BR-HUD-S2-6** The pill body is ONE real link → `/sessions/$id` (TanStack `Link`, SPA — the nav-link
  doctrine: `to` never `href`), full state-bearing `aria-label`; in `?sample` mode the link PRESERVES the
  `sample` search param (seam §D, g1-B5). The pause/resume control is a DOM SIBLING of the link, never
  nested (§E, axe nested-interactive).
- **BR-HUD-S2-7** Pause/resume: ghost icon Button, shown only when `canPause && !complete` at ≥tablet
  (a completed interval has nothing to pause — honest affordance); flips per frozen; emits
  `port.pauseFocus/resumeFocus(sessionId)` — the HUD never writes (EC-5).
- **BR-HUD-S2-8** Ticking digits are NOT aria-live; ONE visually-hidden polite `role="status"` announces
  state CHANGES only (running → paused → `<phase> complete` — the V5 held-announcement voice; EC-8).
  **(g1 fold)** The region is EMPTY on mount and fills only on an observed transition (prev-state ref, the
  V5 "empty until the 0-crossing" mechanism) — a fresh mount never announces.
- **BR-HUD-S2-9** Responsive: `__compact` test override mirrors app-shell's `__bp` convention; live =
  `useMedia()` (mobile = ring+time; ≥tablet adds eyebrow/title/control). No overflow at 375 (EC-6).
- **BR-HUD-S2-10** Tokens only; composes `@tamagui/core` Text/View + `@vida/ui` Button + lucide icons; no
  new `@vida/ui` component (shell rule); no motion introduced (the living-pulse feel = the per-second tick;
  nothing to reduce — EC-9 note).

## §3 Files
- `apps/web/src/session-hud/session-hud.tsx` — `SessionHud({ read, port, __compact? })` + internal
  `HudRing`/`eyebrowFor`. No barrel.
- `apps/web/src/session-hud/session-hud.test.tsx` — forms × affordances × a11y (test-router helper for the Link).
- Visual-Gate harness: extend `apps/web/src/__envision__/main.tsx` to ALSO mount the real `SessionHud`
  (strip-true) behind a `?real=1` switch — the standalone-entry precedent; deleted with the harness at S3.

## §4 Acceptance
1. tsc 0 · eslint 0 · suite green (incl. TZ-forced run).
2. Each `HudRead`/form renders its designed shape: hidden→null · idle (both widths) · countdown(focus/break)
   · elapsed · paused-frozen · complete — asserted on eyebrow text, time text, control presence.
3. Link: real anchor, `to=/sessions/$id`, aria-label carries state+kind+title+time; `sample` param preserved
   in sample mode; pause button a sibling (not a descendant) of the anchor.
4. Pause control: only `canPause && !complete && ≥tablet`; click calls the port with the sessionId; flips
   label/icon per frozen.
5. role=status announces on state change, not per tick.
6. **Visual Gate (blocking):** Brave, the real component standalone entry — 6 forms × ≥3 presets ×
   light/dark × 375/768/1440: AA measured (time/eyebrow/title incl. warm-dark) · axe 0 (incl. no
   nested-interactive) · 0 overflow · ring ink distinct per preset. Victor-reviewed before S3.

## §5 Implementation prompt
Order: `eyebrowFor`/`HudRing` pure parts → `SessionHud` forms (hidden→idle→active) → tests → harness wire →
gates. Mirror the greybox geometry (gap/padding/sizes already approved); reuse `useHudClock`/`useActiveSession`
from S1 untouched.
