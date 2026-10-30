# Spec: component:ui-2-platform-views · V5 — pomodoro-widget

<!-- type: component (unit sub-spec of ui-2-platform-views) -->

Status: implemented + Visual Gate PASS (Victor, 2026-08-10) — DONE
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Parent: docs/specs/components/ui-2-platform-views/\_index.md.

## 1. Identity

V5 `pomodoro-widget` — the interactive **timer widget** `@vida/ui` ships `[FACT: ADR-008:35 "@vida/ui ships interactive
widgets (pomodoro-widget)"]`. A **single-interval countdown** (focus/break) with controls. Currently a 0-byte stub.
NOT a data-view (no VIEW_LAYOUT / items / terminal states) — a standalone widget, minimal spine reuse (Button, base
tokens, ref-prop).

- **The deferred session-engine SEAM (the crux).** The pomodoro **session** is a `sessions` sub-type owned by the
  Sessions framework (ADR-004): its lifecycle (`scheduled→in_progress→completed·skipped·missed`, S5), effects
  (`attach_pomodoro`, `award_xp`, S4), durations config, **phase sequencing** (focus→break→focus, long-break every 4),
  persistence + analytics are **MOD-sessions' (deferred)**, NOT the widget's. `[FACT: ADR-004; capability-framework S1/
S4/S5; CLAUDE.md:249 "pomodoro is now a sessions sub-type"]`
- **What the widget DOES own:** the **ephemeral** visual countdown (drift-free display, start/pause/resume/reset/skip)
  for ONE interval of `durationMs`, and it **emits lifecycle intents** via callbacks. What those intents DO (create a
  `sessions` row, fire effects, choose the next phase) is the consumer's/engine's — the widget is presentational +
  intent-emitting, consistent with BR-2 (state/semantics are the app's).
- **What it is NOT:** NOT the phase SEQUENCE (the consumer feeds the next `durationMs`/`phase` on `onComplete`); NOT
  session persistence/effects/XP; NOT a settings UI (durations config is the engine's); NOT a progress RING (a linear
  bar for V5; ring = deferred polish, §6).

## 2. Business Rules

- **PW-1 · Self-timing, DRIFT-FREE, ref-structured (B1 — the Toast `arm()` precedent).** The widget owns ephemeral
  `remainingMs` (`useState`) + `status` (`idle|running|paused`). Timing is computed from an **`endAtRef` timestamp**
  (`Date.now() + remainingMs` on start). ⚠ **The interval is created IMPERATIVELY inside `start`/`resume`** (like
  `toast.tsx:145-149 arm()`), stored in `intervalRef`; the ~250ms tick reads **`endAtRef.current`** (a ref — never a
  stale closure) and calls the STABLE `setRemainingMs(max(0, endAtRef.current - Date.now()))`. **NO `useEffect` deps on
  `remainingMs`/`status`** (that would tear down + re-arm the interval every tick — the CLAUDE.md Toast bug). The only
  countdown-path effects are (1) unmount cleanup `return () => clearInterval(intervalRef.current)` and (2) the
  `durationMs`-sync (PW-4). `[FACT: toast.tsx:145-161 imperative arm + timer-deps lesson]`
- **PW-1b · `onComplete` ONE-WAY LATCH (B2) + the single `setStatus` helper (gate-2 #1).** ⚠ `status` is held as BOTH
  `useState` (drives control rendering) AND a `statusRef` (read synchronously by the tick latch). They MUST NOT drift,
  so **every** transition goes through one helper `setStatus(next)` that writes **both synchronously**:
  `statusRef.current = next; setStatusState(next)` (NOT a `useEffect` mirror — that lags a commit, so the completion
  tick would read the stale ref). A 250ms tick can observe `remaining<=0` twice before the clear takes (esp. under
  `advanceTimersByTime` flushing two ticks) → the 0-crossing is a **latch**: the tick early-returns if
  `statusRef.current!=='running'` on entry; else it runs the **contractual completion order** —
  `setStatus('idle')` → `clearInterval` → `setRemainingMs(0)` → `onComplete()` **LAST**. Because `statusRef` is a ref,
  its mutation is visible to a same-flush tick2 → `onComplete` fires **exactly once** (the `toast.tsx` idempotent
  `onDismiss` precedent). `onComplete` may synchronously change `durationMs`; the sync effect (PW-4) resolves it on the
  NEXT commit (idle-guarded → no spurious warn). `[FACT: toast.tsx dismiss idempotency + ref-imperative]`
- **PW-2 · Controls by status (compose UI-1 `Button`, M3 intents).** `idle` → **Start** (`intent="primary"`);
  `running` → **Pause** (`secondary`) · **Skip** (`ghost`); `paused` → **Resume** (`primary`) · **Reset** (`ghost`) ·
  **Skip** (`ghost`). All are **text-labelled** ("Start"/"Pause"/… — no icon-only, so no aria-label needed). Reset
  returns `remainingMs=durationMs`, `status='idle'` (clears the interval). Skip discards the interval → `status='idle'`
  (does NOT fire `onComplete`). Each control fires its callback (PW-3) + the local transition. `[FACT: button.tsx
intent primary|secondary|ghost|danger; onPress; icon-only aria-label dev-warn]`
- **PW-3 · The deferred seam = lifecycle-intent callbacks.** `onStart?`, `onPause?`, `onResume?`, `onReset?`,
  `onSkip?`, `onComplete?` — all optional. The widget works fully standalone (self-timing) with none wired; the engine
  (MOD-sessions) wires them to `sessions` lifecycle transitions + effects. The widget NEVER imports session logic.
  `[FACT: ADR-004 lifecycle; ADR-008 no widget registry — plain props]`
- **PW-4 · Duration-driven; the reset seam is ATOMIC + idle-guarded (B3).** `durationMs` (default 25·60·1000) drives
  the countdown + progress. `phase?` is a display LABEL only. A **`durationMs` change is the phase-advance seam** —
  the sync effect performs an **ATOMIC reset**: `endAtRef=undefined`, `remainingMs=durationMs`, `status='idle'`,
  `clearInterval`. This normally fires when the widget is ALREADY idle (the consumer changes `durationMs` on
  `onComplete`, at which point `status==='idle'`) — no live run exists. ⚠ **If `durationMs` changes while
  `status!=='idle'`** (an unusual mid-run change), the reset would silently discard the running interval → **dev-warn**
  ("durationMs changed mid-run — the current interval was discarded"). The sync effect must skip the FIRST run (mount:
  `remainingMs` is already seeded to `durationMs`; a `prevDurationRef` gates on an ACTUAL change — m2). Auto-starting
  the NEXT phase is the engine's, not V5's (§6). `label?: ReactNode`. `autoStart?: boolean` (mount-only effect).
- **PW-5 · Display + motion.** `mm:ss` via the EXACT formula (M1): `const s = Math.ceil(remainingMs/1000); const mm =
Math.floor(s/60); const ss = s%60` → `${pad2(mm)}:${pad2(ss)}` (so the first frame shows `25:00`, completion `00:00`).
  A linear **progress track+fill**: `progress = durationMs > 0 ? clamp(1 - remainingMs/durationMs, 0, 1) : 0` (M4 —
  clamp + divide-by-zero guard; dev-warn if `durationMs<=0`), fill width inline `${progress*100}%`. Fill updates per
  tick (data-driven, **no CSS transition** → B12-safe). No entrance motion (V5).
- **PW-6 · A11y — `role="timer"` (implicit `aria-live=off`) + a polite completion one-shot (M2).** The countdown
  region is `role="timer"` (ARIA's canonical live-region-you-do-NOT-announce-per-tick — so no per-second spam, by the
  role's own default) with an `aria-label` (`${phase ?? 'focus'} timer — ${status}`); the visible `mm:ss` sits inside
  it. Controls are labelled `Button`s. **Standalone completion is announced** by a separate `role="status"` (polite)
  region that is empty until the 0-crossing, then holds "`${phase} complete`". ⚠ **It CLEARS on any transition out of
  complete** (Start/Resume/Reset/`durationMs`-change → empty string) so it announces exactly once and can re-announce a
  FRESH completion later (a held string re-touched on re-render risks a double-announce — the toast insert-then-remove
  precedent). So a screen-reader user isn't left silent in standalone mode; a wired engine Toast is additive.
  `[FACT: WAI-ARIA timer implicit aria-live=off; toast.tsx role=status polite one-shot]`
- **PW-7 · Tokens / no sub-theme (BR-4/LV-3).** Base tokens on unnamed hosts (track `$colorSurfaceSecondary`, fill
  `$colorBrandPrimary`, time `$colorTextPrimary`, muted `$colorTextMuted`); dimension props via the token scale
  (DEF-U8-h). No new dep. `[FACT: themes.ts base keys; CLAUDE.md]`

## 3. Contract

```ts
export type PomodoroPhase = 'focus' | 'short-break' | 'long-break'

export interface PomodoroWidgetProps {
  /** Interval length in ms (> 0). Default 25*60*1000. Changing it RESETS the timer (the phase-advance seam; a mid-run
   *  change dev-warns + discards the run). */
  durationMs?: number
  /** Display label for the current interval (the engine owns real phase semantics). Default 'focus'. */
  phase?: PomodoroPhase
  /** Optional context label (e.g. the linked task/class name). */
  label?: ReactNode
  /** Start counting on mount. Default false. */
  autoStart?: boolean
  /** Lifecycle-intent seam (all optional; the engine — MOD-sessions — wires them to sessions transitions + effects). */
  onStart?: () => void
  onPause?: () => void
  onResume?: () => void
  onReset?: () => void
  onSkip?: () => void
  /** Fires when remainingMs reaches 0 (the engine persists the completed session + fires effects + picks next phase). */
  onComplete?: () => void
  /** Progress indicator form (fe-codec-controls-refinement P1, LIF-231). 'bar' = linear track (default, non-breaking);
   *  'ring' = circular SVG ring around the time (the §6-deferred visual; colors via useTheme().get('web')). */
  progress?: 'bar' | 'ring'
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
}
export function PomodoroWidget(props: PomodoroWidgetProps): ReactElement // NOT generic; React-19 ref-as-prop
```

- 8-state matrix (§VIII): idle · running · paused · complete(00:00) · hover/focus(controls, via Button) · disabled(n/a
  container) · dark · responsive (a compact card, scales trivially). No terminal/data states (not a data-view).
- Sub-theme: none. Export from `index.ts`. `*.test.tsx` (jsdom + `vi.useFakeTimers`) + `*.stories.tsx`.

## 4. Acceptance

- [ ] `PomodoroWidget` counts down drift-free from `durationMs` (endAt/ref-based); `mm:ss` (M1 formula) + progress fill
      track it; **the interval is created ONCE per run** (not re-armed per tick — B1).
- [ ] Controls per status with intents (Start/Resume primary · Pause secondary · Reset/Skip ghost). Each fires its callback.
- [ ] `onComplete` fires **exactly once** (one-way latch, advancing multiple ticks past 0 — B2); interval cleared on
      unmount / pause-then-unmount / reset / mid-run durationMs-change (no leak — B1/m3).
- [ ] `durationMs` change ATOMIC-resets to the new duration (status idle) — the phase-advance seam; a mid-run change dev-warns (B3).
- [ ] `role="timer"` region + aria-label; the time is NOT aria-live; a polite `role="status"` completion one-shot (M2);
      controls are labelled Buttons; `progress` clamped [0,1] + `durationMs<=0` dev-warn (M4).
- [ ] Dark mode + responsive; base tokens (no sub-theme); works standalone (no callbacks wired).
- [ ] Storybook: idle/running/paused/complete + a stateful "wired" story (onComplete advances phase), both themes → Visual Gate.
- [ ] `pnpm --filter @vida/ui typecheck && build && test` green; root typecheck 10/10; §XXIX CLAUDE.md paragraph.

## 5. Implementation Prompt (ordered)

1. **Types** — `PomodoroWidgetProps` + `PomodoroPhase`; plain function (NOT generic); React-19 ref-prop.
2. **Timer state** — `useState` `remainingMs` (init `durationMs`) + `status`; refs `endAtRef`, `intervalRef`,
   `statusRef`, `prevDurationRef` (m2), `completeMsgRef`/state for the polite region. **`setStatus(next)` helper
   (gate-2 #1)** is the ONLY way status changes: `statusRef.current = next; setStatusState(next)` (both synchronous).
   Effects: (a) mount-only `autoStart`;
   (b) `durationMs`-sync gated on `prevDurationRef` ACTUAL change → ATOMIC reset (endAtRef=undefined, remainingMs←
   durationMs, status=idle, clearInterval) + dev-warn if `status!=='idle'` (B3); (c) unmount cleanup clearInterval.
   NONE dep on `remainingMs`.
3. **Controls (imperative — no countdown-state effect, B1; every status write via `setStatus`)** — `start`/`resume`:
   clear the polite completion msg, `endAtRef=Date.now()+remainingMs`, `setStatus('running')`, **`arm()`** =
   `intervalRef=setInterval(250)` whose tick reads `endAtRef.current` + `setRemainingMs`, and at `<=0` runs the
   **latch in contractual order** (B1b: if `statusRef.current!=='running'` return; else `setStatus('idle')` →
   `clearInterval` → `setRemainingMs(0)` → set completion msg → `onComplete()` LAST). `pause`: `clearInterval`,
   `setRemainingMs(max(0,endAtRef-now))`, `setStatus('paused')`. `reset`/`skip`: `clearInterval`, clear completion msg,
   `setStatus('idle')` (reset: `setRemainingMs(durationMs)`). Each fires its callback (PW-3).
4. **styled hosts** — `Root` (card-like column; `role="timer"` at render), `Time` (`fontSize="$display"` — the largest
   emitted font token — `fontFamily="$display"`, tabular; `mm:ss` via the M1 formula),
   `Track`/`Fill` (progress; Fill width inline `${clamp(progress)*100}%`, no transition), `PhaseLabel`, controls
   `<View row>` of `Button`s, + a `role="status"` polite region (empty→"complete" one-shot, PW-6/M2).
5. **A11y** — `role="timer"` + aria-label (`${phase??'focus'} timer — ${status}`); no aria-live on the time; labelled
   Buttons; the polite completion region; `warnMissingName('PomodoroWidget', …)`.
6. **Tests** (jsdom + `vi.useFakeTimers`) — countdown ticks (Date.now faked); **`setInterval` called ONCE per run**
   (B1 — advance many ticks, assert not re-armed); **`onComplete` exactly once** advancing PAST 0 by multiple ticks
   (B2); pause stops the tick; reset restores; `durationMs`-change resets (+ dev-warn when mid-run, B3); mm:ss boundaries
   (`25:00` first frame, `00:00` complete, M1); progress clamp + `durationMs<=0` dev-warn (M4); controls fire callbacks;
   **interval cleared on unmount AND on pause-then-unmount AND on mid-run durationMs-change (no leak)** (m3);
   `role="timer"`; polite completion region gets text at 0 AND is **cleared after Reset/Start** (gate-2 #3); standalone
   (no callbacks) works; **status/statusRef never desync** (a transition then a completion behaves per the latch — gate-2 #1).
7. **Story** — idle/running/paused; a "wired" stateful story where onComplete advances focus→break→focus.
8. **Export** + CLAUDE.md paragraph.

## 6. Deferred (documented — MOD-sessions / later, NOT V5)

The whole session ENGINE: phase sequencing (focus→break→long-break-every-4) · durations config/settings UI · session
persistence (`sessions` sub-type, ADR-004) · effects (`attach_pomodoro`/`award_xp`) · analytics/streaks · completion
notification. ~~Plus a **progress RING** (SVG/conic — a nicer visual than the V5 linear bar)~~ **← REALIZED in
fe-codec-controls-refinement P1 (LIF-231)** as the opt-in `progress='ring'` variant (useTheme-resolved SVG). Still
deferred: audio cues.

## 7. Change Log

| Date       | Session                                   | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-10 | ui-2-platform-views                       | V5 sub-spec authored at PLAN (self-timing timer widget + deferred session-engine seam via lifecycle-intent callbacks; ADR-004/ADR-008 boundary); gate-1 next                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-08-10 | ui-2-platform-views                       | Rev 2 — gate-1 critique REVISE→fixed (seam/scope + drift-free approach validated correct): **B1** (ref-structured imperative interval per toast `arm()`, NO countdown-state effect — the CLAUDE.md Toast re-arm bug), **B2** (onComplete one-way latch via statusRef), **B3** (durationMs-change = ATOMIC idle-guarded reset + mid-run dev-warn), M1 (exact mm:ss formula + boundary tests), M2 (polite role=status completion one-shot for standalone), M3 (per-control intents), M4 (progress clamp + durationMs>0 guard), m1-m3 (phase default, autoStart/sync ordering, pause+unmount/mid-run-change leak tests)                                                                                                                                                                                                                                                                                                          |
| 2026-08-10 | ui-2-platform-views                       | preflight PASSED (`$display`=36 largest font token; Button intents; no new dep). Gate-2 critique **REVISE**→fixed (all 7 gate-1 fixes confirmed correct): **#1 blocker** — status/statusRef desync → single `setStatus(next)` set-both helper (every transition through it; NOT a lagging useEffect); **#2** contractual latch order (setStatus idle→clear→setRemainingMs(0)→onComplete last; re-entrancy safe by commit semantics); **#3** polite completion region CLEARS on transition-out (one-shot, no double-announce). **Approval 2 pending.**                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-10-06 | fe-codec-controls-refinement P1 (LIF-231) | Aesthetic refinement + the §6-deferred **progress RING**. Added **`progress?: 'bar' \| 'ring'`** (default 'bar', non-breaking) — a local `ProgressRing` (two-circle `<svg>`, aria-hidden, stepped `strokeDashoffset`, colors via `useTheme().get('web')` — the Tamagui SVG call, NOT a `$token`/hex → preset-aware + token-pure, avoids the NG conformance gap). L1 polish: **tabular figures** on `Time` (completes the §4:144 spec'd-but-unbuilt `tabular`), **eyebrow phase label**, **6px hairline track**, **resting elevation** (`shadow.resting`). Internal fraction renamed `fraction`. Timer/latch/controls UNTOUCHED. §XXVI double-gate (gate-1 + preflight + gate-2 all folded) + code-review + Visual Gate PASS (Brave, 3 presets × light/dark: tabular + eyebrow all cells · ring accent flips per preset+mode · AA 4.94–6.03 incl. warm-dark · axe 0 · 375 no-overflow). tsc 0 · @vida/ui 411 tests · eslint 0. |
