<!-- PLAN — fe-session-hud S1 (substrate: types + clock + hook) · §XXVI forward spec.
     Authority: delivery/{seam-contract,slice-map,envision}.md (Approval 1 granted 2026-10-16).
     Home: apps/web/src/session-hud/ (NEW context — D6 docs birth at this slice). -->

# PLAN S1 — Session HUD substrate

## §1 Context
First slice of fe-session-hud (#16). Logic-only (renders nothing): the seam types, the M1 stub data hook,
and the drift-free HUD clock. S2 (the pill) renders over these; S3 mounts. Verification Gate (no Visual Gate).

## §2 Business rules (BR-HUD-S1-*)
- **BR-HUD-S1-1** `HudRead` is tri-state (`hidden`/`idle`/`active`) — idle-visible is representable without a
  signature change (g1-B4); M1 prod resolves `hidden`.
- **BR-HUD-S1-2** `HudTiming.countdown` carries `phase` (focus/short-break/long-break — EC-3d) +
  `endAt`/`durationSeconds`/`pausedAt?`; `elapsed` carries `startedAt`. No `paused` boolean anywhere —
  paused is DERIVED (`pausedAt != null`), it can never desync (g1 nit 1).
- **BR-HUD-S1-3** The clock freezes while paused: shown remaining = `endAt − pausedAt`, constant (PD-5).
- **BR-HUD-S1-4** Zero-cross HOLDS: `now ≥ endAt` ⇒ remaining = 0, `complete: true` — never negative, never
  overtime (EC-3c; V5 hold-complete precedent). The clock keeps ticking only to detect the cross, then the
  displayed value is stable.
- **BR-HUD-S1-5** Ticking is drift-free and imperative: derived from timestamps each tick; the interval is
  armed in an explicit `run()`/cleanup pair — NO `useEffect` deps on the countdown value (the V5
  `endAtRef`/`arm()` trap). Tick cadence ~1s (500ms acceptable); unmount clears.
- **BR-HUD-S1-6** The stub hook is honest: default `{kind:'hidden'}`; DEV `?sample=idle|focus|break|elapsed|
  paused|complete` seeds the six demo reads (idle + 5 active forms); non-DEV ignores `?sample`
  (`import.meta.env.DEV` gate — the flow/notifications convention). The hook header documents the live
  two-source model (seam §A) verbatim enough to swap without re-derivation.
- **BR-HUD-S1-6b** (g1 fold) **Resolution and failure both render as `hidden`** — the hook's return type is
  `HudRead` with `hidden` during an in-flight live read AND on a failed one (+ dev-warn). A strip indicator
  never shows loading/error chrome (phantom-chrome analogue of EC-2); this keeps the LIVE async swap
  zero-signature (the B4-class trap applied to loading).
- **BR-HUD-S1-7** The intent port is no-op-safe: `pauseFocus`/`resumeFocus` resolve without effect in M1
  (the `useFlowSession` port precedent); the HUD never writes (BR-FS-2 analogue).
- **BR-HUD-S1-8** Formatting: `mm:ss` under an hour, `h:mm:ss` at/over; zero-pad seconds (and minutes in the
  h-form); durations only (TZ-neutral by construction — proven by a TZ-forced test run).
- **BR-HUD-S1-9** (g1 fold) `HudClock` is a pure PROJECTION of `(timing, now)` — `frozen`/`complete`/`progress`
  are derived inside `deriveHudClock`, never stored state (no desync class). Pins: paused ⇒ progress constant;
  complete ⇒ progress 1; `elapsed` ⇒ progress 0 (S2 renders ring-as-glyph, no arc). The tick may keep running
  after complete (cheap, re-derives stably); a `timing` prop change re-derives on the next tick.

## §3 Files
- `apps/web/src/session-hud/types.ts` — seam §A/§B types (mirror-by-value; no `@vida/core` import).
- `apps/web/src/session-hud/use-active-session.ts` — `useActiveSession(): { read: HudRead, port: HudSessionsPort }`
  (stub + `?sample`; React Query NOT needed for a constant stub — plain memo; live swap = the documented hook body).
- `apps/web/src/session-hud/use-hud-clock.ts` — `useHudClock(timing: HudTiming): HudClock` where
  `HudClock = { display: string; progress: number /*0..1, countdown only*/; complete: boolean; frozen: boolean }`
  + exported pure helpers `deriveHudClock(timing, now)` and `formatHudTime(ms)` (the testable core; the hook
  is a thin ticking wrapper).
- `apps/web/src/session-hud/*.test.ts` — co-located vitest (shell convention).
- `apps/web/src/session-hud/CLAUDE.md` — D6 context docs birth (what/pattern/rules), with
  `docs/modules`-tier current-* deferred to the unit close (§XXIX refresh covers it).

## §4 Acceptance
1. tsc 0 · eslint 0.
2. `deriveHudClock`: countdown remaining math · paused freeze (constant across advancing `now`, progress
   constant) · zero-cross hold (0 + complete, progress 1, never negative) · elapsed count-up (progress 0) ·
   progress clamp 0..1 · divide-by-zero guard (`durationSeconds<=0` → dev-warn, progress 0).
3. `formatHudTime`: `0:00` · `17:42` · `1:07:12` boundaries (59/60s, 59/60min) · negative input clamps to `0:00`.
4. Hook: arms once, derives from refs (no re-arm per tick — asserted via interval-spawn count), clears on
   unmount; paused timing never ticks the display.
5. `useActiveSession`: `hidden` default; each `?sample` value yields its designed read (DEV); non-DEV ignores;
   port methods resolve (no throw).
6. Full run green under `TZ=Asia/Tokyo` (duration math TZ-neutral — the g2-mod-tasks-S5 lesson, proven not assumed).

## §4b Implementation notes (post-build)
- **g2 F1 (blocking, fixed):** the stub rebuilt sample reads with a fresh `Date.now()` per render — a
  value-UNEQUAL timing per render would re-key the clock and pin the demo countdown. Fixed with a
  module-level per-form capture (once per page load; the demo now genuinely ticks and the focus sample
  eventually walks EC-3c live). The PLAN §3 "plain memo" is realized at module scope, keeping the hook a
  plain function (the use-flow-session precedent). Tests added: referential stability across calls +
  non-DEV `?sample` ignore + the progress clamp-LOW branch. g2 nits folded: warn-once on zero-duration;
  CLAUDE.md "per timing VALUE" wording. **BR-HUD-S1-6 wording note:** the DEV gate is the sibling
  `process.env.NODE_ENV !== 'production'` idiom (Vite define-replaced), not `import.meta.env.DEV` — same
  semantics, the flow convention wins.
- **Value-keyed re-arm (in-build triage, ISOLATED):** the first cut's `[timing]` effect dep was
  identity-keyed — a consumer rebuilding an equal timing per render would re-arm the interval on every
  tick-driven re-render (caught by the arm-count test: 3 arms for 1 intent). Fixed: the effect deps on
  `timingKey(timing)` (the serialized VALUES); `timingRef` carries the object. BR-HUD-S1-5 intent unchanged.
- TZ-forced acceptance (6) proven: full suite green under `TZ=Asia/Tokyo` (vitest start-at shows Tokyo time).

## §5 Implementation prompt
Build in the order: types → pure helpers (`deriveHudClock`/`formatHudTime`) + tests → `use-hud-clock` wrapper
+ tests → `use-active-session` + tests → CLAUDE.md. Vitest only (no DOM render needed beyond hooks —
`renderHook` from @testing-library/react, the repo's hook-test convention). No new deps.
