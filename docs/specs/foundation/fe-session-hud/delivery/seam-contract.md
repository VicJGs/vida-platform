<!-- Seam Contract — fe-session-hud #16 · Entity Delivery Flow §2. The service surface the HUD consumes +
     the app-plane seams it defines. Decide-mode (net-new unit). Base: origin/main @ 8c1070d + PR #142 + #143. -->

# Seam Contract — Session HUD (#16)

The HUD is pure ② (apps/web). It defines TWO seams and consumes ONE shipped pattern; it adds **zero**
`@vida/core` imports in UI files (the flow-adapter discipline `[FACT: apps/web/src/flow/CLAUDE.md:36-39]`).

## A. Read seam — `ActiveSessionRead` (the "what's running now" question)

```ts
// session-hud/types.ts (app plane, mirror-by-value — no @vida/core import)
export type HudTiming =
  | {
      kind: 'countdown' // a timed focus-runtime interval (focus OR break — PD-4; EC-3d)
      phase: 'focus' | 'short-break' | 'long-break' // mirror-by-value of @vida/ui PomodoroPhase
      endAt: number // epoch ms — the CURRENT interval's end
      durationSeconds: number // the interval's planned length (ring progress denominator)
      pausedAt?: number // epoch ms — set while the focus runtime is paused; frozen remaining
      //                   = endAt − pausedAt (g1-B2: endAt is stale during a pause by construction —
      //                   total_pause_seconds folds in only on resume [FACT: service.ts:241-250,456])
    }
  | { kind: 'elapsed'; startedAt: number /* epoch ms */ } // any un-timed in_progress session (EC-3b)

export interface HudSource {
  sessionId: string // deep-link target /sessions/$id (EC-3)
  kindLabel: string // eyebrow — sub_type/purpose plain label, e.g. "Focus"
  title: string // session title (truncated by the pill)
  timing: HudTiming
  // NOTE: no `paused` boolean — paused is DERIVED (`timing.kind==='countdown' && timing.pausedAt != null`)
  // so it can never desync from the clock (g1 confirm-pass nit 1). Generic sessions can never be paused.
  canPause: boolean // true iff a focus runtime row backs this session
}

// Tri-state read (g1-B4): idle-VISIBLE must be representable through the seam — EC-2's invitation is a
// structural Visual-Gate MUST, and post-#34 "idle when a start-capable target exists" must not need a
// signature change. M1 stub → 'hidden'; DEV ?sample=idle → 'idle'; live → 'hidden' | active (then 'idle'
// once a start flow ships).
export type HudRead =
  | { kind: 'hidden' } // M1 prod — the HUD renders nothing (Envision answer 1)
  | { kind: 'idle' } // the designed invitation (DEV ?sample in M1; live post-#34)
  | { kind: 'active'; source: HudSource }

export type ActiveSessionRead = () => Promise<HudRead>
```

- **M1 binding = stub** (`stubActiveSession` → `{kind:'hidden'}`): honest-empty ⇒ the HUD renders NOTHING in
  prod (Envision answer 1 — no dead "Begin" affordance). DEV `?sample` seeds every state (idle ·
  running-countdown · running-elapsed · paused-frozen · overtime). The `useFlowSession` stub discipline
  `[FACT: flow/CLAUDE.md:23-28 — no composition root; worker `values` seam throws]`.
- **Live binding (deferred; the UI-seam SIGNATURE is stable — the live model is DOC-FIXED, grounding pass):**
  the ticking interval clock is **client-ephemeral BY DESIGN** — the V5 widget "only owns the ephemeral
  countdown + emits lifecycle intents" `[FACT: packages/ui/src/CLAUDE.md:298-306]`; the service persists
  interval SUMMARY facts, with analytics derived-on-read (PD-11): `duration_seconds` is written at
  completion as the DERIVED actual focus time `[FACT: service.ts:437,498-502 · session-extensions.ts:40
  nullable]`, no interval-start is persisted (`completeFocus` falls back to `created_at`; `nextInterval`
  persists none `[FACT: service.ts:465-481,497]`), and the planned length lives in `resolveFocusConfig()`
  (prefs → PD-3) `[FACT: service.ts:215-232]`. So the live architecture is two-source:
  1. **①-read (F-HUD-1, genuinely missing):** `findActiveSession()` — `SessionsService` has
     `getSession(id)` only, no open/in-progress query `[FACT: services/sessions/service.ts:118-166]`.
     Serves the coarse truth: which session, spine `started_at` (⇒ honest `elapsed`), focus row when present.
  2. **②-plane shared focus-runtime store (the live countdown source):** the strip HUD outlives routes, so
     the CLIENT truth the widget/runtime-page driver holds (interval endAt/phase/pausedAt) must live in an
     app-level store both read — the scope-store precedent. Ships with the first live timer DRIVER (the
     engine first-consumer), not this unit. Cold boot / reload mid-interval ⇒ no client clock ⇒ the HUD
     honestly serves `elapsed` (spine `started_at`) and withholds countdown — doc-consistent (the persisted
     model never promised a reconstructable mid-interval clock). A reload-survivable countdown would be a ①
     persistence AMENDMENT (interval-start on the row) — a future call F-HUD-1 NOTES, not assumes.

## B. Intent port — `HudSessionsPort` (the HUD never writes, BR-FS-2 analogue)

```ts
export interface HudSessionsPort {
  pauseFocus(id: string): Promise<void> // ⊂ SessionsService.pauseFocus [FACT: service.ts:138]
  resumeFocus(id: string): Promise<void> // ⊂ SessionsService.resumeFocus [FACT: service.ts:139]
}
```

- Offered ONLY when `canPause` (focus runtime). Generic `in_progress` sessions get NO in-strip control —
  `SESSION_STATUS` has no `paused` member `[FACT: packages/types/src/session.ts:58-66]`.
- M1 binding = no-op-safe stub (the `useFlowSession` port precedent); live = `bindFlowIntents`-style
  binding at the composition root (deferred with the data plane).

## C. Placement seam (shipped — consumed, not built)

- `AppShell.hudSlot` `[FACT: apps/web/src/shell/app-shell.tsx:71,95,298-299]`; mounted from `routes.tsx`
  `RootComponent` beside `bar1Slot` `[FACT: routes.tsx:29-35]`. The HUD is content-fit; Bar-1 keeps `flex:1`
  (EC-1).

## D. Tick derivation (HUD-owned, render-plane)

- Drift-free: remaining/elapsed derive from `endAt`/`startedAt` timestamps on a ~1s interval armed
  imperatively — NEVER `useEffect` deps on countdown state (the V5 pomodoro `endAtRef`/`arm()` trap
  `[FACT: packages/ui/src/CLAUDE.md:302-306]`). The ticking digits are not `aria-live` (EC-8).
- **Paused freeze (g1-B2, PD-5):** while `timing.pausedAt` is set the clock does not tick — the shown
  remaining is the constant `endAt − pausedAt`; the ring arc holds.
- **Zero-cross = hold-complete, the V5 widget precedent (g1-B3 → EC-3c, DOC-GROUNDED):** when `now ≥ endAt`
  on a running countdown the display HOLDS `00:00` (ring full) and the eyebrow flips to the completion cue
  (`<PHASE> · DONE` — the widget's held "${phase} complete" announcement `[FACT:
  v5-pomodoro-widget.md:67,75-76]`). Interval-boundary behaviour (auto-start next / notify / sound) is
  PD-7 preference-owned and ENGINE-driven — the HUD owns no advance intent (`nextInterval` lives on
  `/sessions/$id`) and never invents overtime: intervals are fixed-length (PD-4) and overrun is not focus
  credit (PD-5). Never negative time.
- **DEV sample deep-link (g1-B5):** in `?sample` mode the pill's link PRESERVES the `sample` search param so
  `/sessions/$id` lands on the sampled runtime page (`useFlowSession` seeds under its own `?sample`
  `[FACT: use-flow-session.ts:48-57,70-83]`) — the S3 integration test asserts the param carries through.
  Live mode carries no extra params.

## E. Strip conduct (a11y composition — g1-N1/N2)

- The pause/resume ghost is a DOM **sibling** of the pill's link, never nested inside it
  (nested-interactive = axe serious).
- The HUD adds tabbable strip siblings exactly as Bar-1 does; while a float panel is open the shell's own
  trap discipline governs (`ShellPanel` contains keyboard; the shell sets bar-toggle `tabIndex=-1` itself
  `[FACT: app-shell.tsx:279-282]`) — the HUD does NO per-unit tabIndex handling (the Bar-1 precedent).

## Out (homed elsewhere)

- The live data plane (composition root + worker Drizzle seam) — UI-3 / M1.1+ (MVP-PATH §4).
- `findActiveSession` ①-read — **F-HUD-1** → MOD-sessions first-consumer.
- Session START flow (the idle "Begin" target) — `fe-sessions` #34 (per Envision answer 1, idle stays
  hidden until a start-capable flow exists). The widget-lens idle "anti-lost prompt" doctrine
  `[FACT: pomodoro/business-rules.md:73]` supports the post-#34 idle-visible form.
- Rich runtime controls (skip/complete/next-interval) — the `/sessions/$id` page (#23, shipped).
- **Focus Mode** (the runtime's immersive per-type face, `[INTENT: pomodoro/identity.md:32-38]`) — a
  separate INTENDED surface; the HUD deep-links to the session, it is not and never becomes Focus Mode.
- The shared focus-runtime client store (§A.2) — ships with the first live timer driver, not here.
