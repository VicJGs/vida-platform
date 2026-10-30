# fe-codec-flow-session — Slice Map (Decomposition Gate, Step 2)

> **STATUS (2026-10-07): BOTH SLICES SHIPPED.** S1 `FlowSessionView` (`@vida/ui`, 14 jsdom tests, Visual Gate PASS — title
> serif AA 15.84 · text AA 4.95–4.96 incl. warm-dark · progress bar · current-stage affordances · fulcrum · effect-rail ·
> axe 0 · 375 no overflow; /critique SHIP) · S2 flow adapter (`apps/web`, 9 tests — `toFlowProps` + `mapEffectLog` +
> `bindFlowIntents` against a `SessionsPort`; live `useFlowSession` hook deferred, R3). Unit complete → PR.

> The buildable slices + the backend/frontend split, grounded in interpretation §1–§6 + the pinned envision EC-1…EC-11
> (APPROVED 2026-10-07). **Mode:** Decide (net-new shell; the split is NOT doc-fixed, decided here per
> entity-delivery-flow.md §8) — but the SHAPE **ratifies** the three shipped siblings (S1 presentational shell → `@vida/ui`;
> adapter → `apps/web`) [FACT: collection-view.tsx · dashboard-view.tsx · entity-view.tsx]. **No backend track** — the
> sessions spine + effect rail + attachments are FROZEN + SHIPPED in `@vida/core` (AR-5); nothing is authored there, and the
> "stages" structure is a **design-intent extension** homed OUT (to #23 / a schema amendment), NOT built here [FACT:
> frontend-quality-bar/_index.md:139; ADR-004-session-framework.md]. Approved before per-slice work. Each slice is a full
> Entity-Delivery-Flow ② iteration (contract → scaffold → implement → tsc → audit → /critique → **per-slice Visual Gate**).

## The planes (interpretation §1 boundary — `@vida/ui` is Tamagui-only)

| plane | slice | what |
|---|---|---|
| **`@vida/ui`** (presentational) | **S1** | `FlowSessionView` — the flow FRAME: title-hero header + `HonestProgress` + save-state slot + `⋯` + the staged `Timeline` rail (done/current/upcoming + fulcrum) + the per-stage body slot + the **standardized stage affordances** (attach · mark-done · require-proof, emitting intents) + the effect-rail LOG surface + per-stage state |
| **`apps/web`** (canon-wiring) | **S2** | the session/flow↔FlowSessionView adapter — maps a `sessions` row + its attachments + the fired-effect log → props + wires the intents (attach/transition) to the sessions service (live `useSession`/`useFlow` hook deferred to first consumer, R3) |

Two slices — like all three siblings. The shell holds the frame + rail + standardized affordances + effect-log + state in
one cohesive component (S1); the data mapping + intent wiring are the adapter (S2).

## Slices

### S1 — `FlowSessionView` (presentational flow frame) · plane `@vida/ui` · frontend
**Scope:** the whole presentational shell.
- a **title-hero header** — the serif `$display` title (carries alone), + an optional quiet context line, + a
  **`HonestProgress` bar** for progress (NOT a text subtitle — EC-5), + a save-state slot (`SyncStatus`), + an `action`
  slot (`⋯`); `role="region"` named via `warnMissingName`/`useId`; **16px title→meta rhythm** (EC-5, review-2) [EC-5];
- the **staged progression** — the shipped `Timeline`, `getTemporalState` done/current/upcoming + `nowFulcrum` = the
  "current stage" boundary; done collapsed (✓ + proof), current emphasized, upcoming faded [EC-1, EC-3];
- the **per-stage body slot** — a `renderStage(stage)` render-prop for the deliverable CONTENT (description / custom body);
  the shell frames it + supplies the standardized affordances (below) [EC-2];
- the **standardized stage affordances** (the archetype's point) — for the current stage: **attach** (document / photo /
  audio) + **mark-done** + **require-proof** controls, emitting **intents** (`onAttach`/`onMarkDone`/`onRequireProof`),
  never a write (the pomodoro-widget intent-emit precedent) [EC-2];
- the **effect-rail log** — a calm, chronological `ListView` of fired effects (type label + detail); empty → a teaching
  `EmptyState`; read-only (the shell fires nothing) [EC-4];
- **per-stage / per-surface state** — each threads its own `loading`/`empty`/`error`/`success` as a PROP; a loading stage =
  calm skeleton (`aria-busy`), an errored stage/log = calm `role="status"` muted (never `$colorSignalDanger`) — degrade,
  never crash (BR-2) [EC-6];
- **responsive** — the staged layout + effect log reflow 375→1440, no 375 overflow, content column centered [EC-7];
- **typography discipline** — the semantic type SCALE only, **no arbitrary px** (`design.md:103`); serif `$display` title ·
  current `$heading` · done/upcoming `$subheading` · body `$body` · labels `$caption`/`$small`; weight is hierarchy; accent
  spent in ONE place; DIRECT semantic tokens, dark designed, preset accent flips [EC-8, EC-11];
- `useReducedMotion` on any stage-transition motion; React-19 ref-as-prop (non-generic — holds no `<T>`).
**Covers:** EC-1, EC-2, EC-3, EC-4, EC-5, EC-6, EC-7, EC-8, EC-9, EC-11 (all `structural`) + EC-10 (`feel`, stage-advance immediacy).
**Visual Gate MUSTs:** EC-1…EC-9 + EC-11 asserted in a real browser × 3 presets × light/dark × 375/768/1440 + axe.
**Out:** the stage BODY CONTENT (consumer `renderStage`) · the effect WRITES + lifecycle engine (`@vida/core`) · the "stages" backend shape (design-intent ext → #23) · the timer/HUD (#16).

### S2 — session/flow↔FlowSessionView adapter (convention + types + intent wiring) · plane `apps/web` · shared
**Scope:** the documented shape a consumer uses to drive `FlowSessionView` from the FROZEN `@vida/core` sessions service.
- `import` the sessions service + `isEntityType` (the attached-entity identity) — **this plane only** (forbidden in `@vida/ui`);
- a pure `toFlowProps(...)` mapping — a `sessions` row + its resolved stages + `session_attachments` + the `applied_effects`
  log → `FlowSessionViewProps` (incl. the `HonestProgress` fraction + the effect-log entries);
- the **intent wiring CONVENTION** — `onMarkDone`→`transition(sessionId,'complete')`, `onAttach`→`attach(...)`,
  `onRequireProof`→the proof flow; each an intent the adapter binds to the service [FACT: ADR-004:60-65; seam-contract Seam B];
- the `FlowAdapter` convention interface + a mapping/intent unit test. **Live `useFlowSession(sessionId)` hook deferred to
  the first consumer** (fe-session-runtime #23 / fe-check-ins / fe-onboarding), exactly the sibling-adapter shape (pure
  pieces + types + convention ship; the React-Query hook defers) [R3; FACT: fe-codec-entity-facet slice-map S2].
**Covers:** the §2.3 NEED + M4; the data/intent binding behind EC-2/EC-4 (their presentation is S1).
**Out:** the live hook · the "stages" backend realization (design-intent ext → #23 / schema) · per-consumer flow surfaces (O7).

## EC → slice coverage (every `structural` EC maps to ≥1 slice)

| EC | type | slice | carried as |
|----|------|-------|-----------|
| EC-1 staged progression (done/current/upcoming + fulcrum) | structural | S1 | Visual-Gate MUST |
| EC-2 current stage: deliverable + attach + mark-done/proof | structural | S1 (affordances) + S2 (intent wiring) | Visual-Gate MUST |
| EC-3 done shows proof · upcoming faded · dot temporal state | structural | S1 | Visual-Gate MUST |
| EC-4 effect-rail log (calm, chronological; empty = teaching) | structural | S1 (presentation) + S2 (data) | Visual-Gate MUST |
| EC-5 title-hero header + progress BAR + 16px rhythm | structural | S1 | Visual-Gate MUST |
| EC-6 per-stage independent state, calm degrade | structural | S1 | Visual-Gate MUST |
| EC-7 reflow 375→1440, no overflow, centered | structural | S1 | Visual-Gate MUST |
| EC-8 serif title · DIRECT tokens · dark designed · preset flips | structural | S1 | Visual-Gate MUST |
| EC-9 single-stage reads sanely (no spurious chrome) | structural | S1 | Visual-Gate MUST |
| EC-10 stage-advance immediacy · attach/proof feel direct | feel | S1 | live Visual Gate (feel) |
| EC-11 semantic type scale, no px · consistent hierarchy | structural | S1 | Visual-Gate MUST |

All `structural` ECs home to S1 (the frame is where the rail/affordances/log/state/typography live); EC-2's intent wiring +
EC-4's data are S2, but their *presentation* is S1 — coverage complete, no unhomed EC.

## Out of scope (homed by the docs — interpretation §5 OVERFLOWING)
- The persistent **timer HUD** (region 6) → `fe-session-hud` #16 (O1) · the **session runtime PAGE** → `fe-session-runtime`
  #23 (O2) · the **countdown widget** → pomodoro-widget ui-2 V5 ✅ (O3).
- The effect **WRITES** + lifecycle transition engine → `@vida/core` services/sessions + the AR-7 effect rail (#32) (O4).
- The attachment **STORAGE** (`note_attachments`) + `deliverable_note` pages → `@vida/core` (frozen; READ) (O5).
- The **sub-type registry / open session types** → `@vida/core` (AR-5/AR-7, frozen; READ) (O6).
- **Per-consumer flow SURFACES + the "stages" backend realization** (routine-run · grading-builder · wizards · drills ·
  onboarding · check-ins) → each owning module's ② track / a schema amendment (O7).

## Build order
**S1 → S2.** S1 is the shell every staged surface needs; S2 is the convention that maps a session/flow into it + wires the
intents. S1 carries all ECs + the Visual Gate; S2 is pure + type-level (no Visual Gate — no rendered surface, the sibling
adapter precedent).
