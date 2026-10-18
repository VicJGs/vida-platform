# apps/web/src/session-hud — the Session HUD (fe-session-hud #16)

**Owning issue:** fe-session-hud (LIF-217) — ② frontend CODEC chrome, G6 unit #16: "Session HUD (region 6) —
persistent timer/stage, responsive placement". Delivery docs: `docs/specs/foundation/fe-session-hud/`.
**Authorities:** the pomodoro capability docs (PD-1…PD-12, `docs/features/pomodoro/`) — Pomodoro IS the focus
runtime this HUD surfaces; ADR-004 (sessions framework); the V5 pomodoro-widget timer discipline
(`packages/ui/src/CLAUDE.md`); the shell chrome rules (`../shell/CLAUDE.md`).

## What lives here
- `types.ts` (S1) — the seam: `HudRead` (tri-state `hidden`/`idle`/`active` — idle-visible is representable
  without a signature change) · `HudSource` (no `paused` boolean — paused is DERIVED from
  `timing.pausedAt`, desync-proof) · `HudTiming` (`countdown` carries `phase` focus/short-break/long-break
  [EC-3d] + `endAt`/`durationSeconds`/`pausedAt?`; `elapsed` carries `startedAt`) · `ActiveSessionRead` ·
  `HudSessionsPort` (pause/resume — the HUD never writes; binds at the live swap).
- `use-hud-clock.ts` (S1) — `deriveHudClock(timing, now)` + `formatHudTime(ms)` (pure, the testable core) +
  `useHudClock(timing)` (ticking wrapper: ONE interval per timing VALUE — the effect deps on the serialized
  `timingKey`, never object identity — re-deriving from timestamps each tick, the V5 `endAtRef` drift-free
  discipline; state-equal bail so frozen/complete don't re-render).
  **Semantics are doc-fixed:** paused ⇒ frozen at `endAt − pausedAt` (PD-5) · zero-cross ⇒ HOLD `0:00` +
  `complete`, ring full — the V5 hold-complete precedent; boundary behaviour is PD-7 preference-owned and
  engine-driven, NEVER HUD-invented overtime · elapsed ⇒ honest count-up, progress 0.
- `use-active-session.ts` (S1) — the data hook. **M1 stub** (sibling discipline): default `{kind:'hidden'}`
  (the HUD renders NOTHING in prod — Envision answer 1); DEV `?sample=idle|focus|break|elapsed|paused|complete`
  seeds the designed forms; loading AND failure render as `hidden` (+dev-warn) — a strip indicator never shows
  loading/error chrome (BR-HUD-S1-6b). Live swap = the two-source model in the hook header (① `findActiveSession`
  [F-HUD-1] + the ② shared focus-runtime client store; cold reload mid-interval honestly degrades to elapsed).

## Rules (do not violate)
- **The clock is a pure projection** of `(timing, now)` — never store/decrement countdown state; never put
  the countdown value in effect deps (re-arms per tick — the V5 `arm()` trap).
- **No `@vida/core` import** — mirror-by-value types; the service edge binds at the live swap only.
- **Honest time only** — no invented remaining-time (EC-3b), no overtime (EC-3c), no phantom loading pill.
- **Pause is focus-runtime-only** — generic sessions never show a pause control (`SESSION_STATUS` has no
  `paused`; `canPause` gates it).

## S2 — the pill (`session-hud.tsx`)
`SessionHud({read, port, __compact?})` renders `HudRead`: hidden→null · idle invitation (presentational in
M1 — no dead begin-affordance) · active = preset-aware SVG ring + tabular time + (≥tablet) PHASE eyebrow
(`FOCUS`/`BREAK`/`PAUSED`/`<Phase> · Done`) + truncated title; the body is ONE real SPA link →
`/sessions/$id` (createLink; `?sample` param carried in DEV); pause/resume ghost = a DOM SIBLING of the
anchor, only `canPause && !complete && ≥tablet`; ONE sr-only polite status announces TRANSITIONS only
(empty on mount). ⚠ UA `:any-link` paints an anchor-level underline/blue ACROSS in-flow children — reset
at the ANCHOR (`style textDecoration/color`); a child's `textDecorationLine:'none'` cannot cancel it.

## S3 — the shell mount (`session-hud-surface.tsx` + routes.tsx hudSlot)
The hudSlot composition: subscribes to the ROUTER's search (`useRouterState` → `location.searchStr`) and
feeds `useActiveSession(search)` — a bare `window.location` read is render-time-only and never updates on
client-side pushState (the S3 Visual-Gate catch). M1 prod: hidden ⇒ the strip is unchanged. No per-unit
tabIndex (the Bar-1 trap precedent). Deferred work: `delivery/findings.md` F-HUD-1.
