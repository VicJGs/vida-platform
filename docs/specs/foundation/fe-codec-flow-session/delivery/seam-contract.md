# fe-codec-flow-session — Seam Contract (Decomposition Gate, Step 2)

> The two APIs that keep the planes coherent (interpretation §1 boundary). **Seam A** = the `@vida/ui` `FlowSessionView`
> props (what a consumer passes). **Seam B** = the `apps/web` adapter that maps a `sessions` row + attachments + the
> fired-effect log → Seam A and wires the lifecycle INTENTS to the FROZEN `@vida/core` sessions service. Proposed here;
> **ratified at `/contract` (Step 4)**. Grounds: interpretation §1–§6 · slice-map S1–S2 · envision EC-1…EC-11 ·
> timeline.tsx · list-view.tsx · card.tsx · sync-status.tsx (HonestProgress) · internal/data-view.tsx · ADR-004.

## Seam A — `FlowSessionView` props (`@vida/ui`, presentational; S1)

```ts
// LOCAL unions — @vida/ui is Tamagui-only. State reuses the SHIPPED intra-package ViewState (the sibling precedent) —
// NOT a parallel-named alias. Stage status maps to the Timeline's TemporalState (done→past · current→present · upcoming→future).
import type { ViewState } from '../internal/data-view' // 'loading' | 'empty' | 'error' | 'success'

type StageStatus = 'done' | 'current' | 'upcoming'
type AttachKind = 'document' | 'photo' | 'audio'

interface FlowStage {
  id: string
  label: ReactNode // the stage eyebrow / kicker (e.g. "Stage 1") — the Timeline getEyebrow (a legit sequence)
  title: ReactNode // the deliverable title — serif; current = $heading, done/upcoming = $subheading muted
  status: StageStatus // drives the rail temporal state + whether affordances render (current only)
  state?: ViewState // the stage BODY's own state (BR-2); default 'success'
  proof?: ReactNode // a done stage's delivered-proof summary (shown collapsed)
}

interface FlowEffect {
  // one fired effect, for the read-only effect-rail log
  id: string
  kind: ReactNode // the effect type label (e.g. "Logged time") — muted, sentence case (no all-caps)
  detail: ReactNode // what fired (e.g. "25 min to 'Write the book'")
}

interface FlowSessionViewProps {
  // ── title-hero header (EC-5) — the serif title carries; progress is a BAR, not a text subtitle ──
  title: string // names the region + renders as the $display serif H1
  context?: ReactNode // ONE quiet plain-language line (e.g. "For 'Write the book'") — $small muted, 16px below title
  progress?: number // 0..1 → HonestProgress fraction; if omitted, DERIVED from stages (done / total)
  progressLabel?: string // e.g. "2 of 5 stages done"; if omitted, derived
  saveStatus?: ReactNode // the SyncStatus slot (right-aligned)
  action?: ReactNode // the ⋯ action SLOT (right-aligned)

  // ── the staged progression (EC-1/EC-3) — rendered via the shipped Timeline (done/current/upcoming + fulcrum) ──
  stages: FlowStage[]
  renderStage?: (stage: FlowStage) => ReactNode // the deliverable BODY CONTENT (description / form / custom); the shell
  // frames it + supplies the standardized affordances (below) for `current`
  nowLabel?: ReactNode // the fulcrum label (default "current stage")

  // ── standardized stage affordances (EC-2) — the shell renders these for the CURRENT stage, EMITTING intents (no write) ──
  onAttach?: (stageId: string, kind: AttachKind) => void
  onMarkDone?: (stageId: string) => void
  onRequireProof?: (stageId: string) => void // the "require proof" completion mode (§4.5 "mark-done OR require proof")

  // ── the effect-rail log (EC-4) — read-only; the shell fires nothing ──
  effects?: FlowEffect[]
  effectsState?: ViewState // BR-2; empty → a teaching EmptyState ("Nothing logged yet")
  effectRailLabel?: ReactNode // default "Effect rail"

  'aria-label'?: string
  'aria-labelledby'?: string
  ref?: Ref<HTMLDivElement> // React-19 ref-as-prop (no forwardRef; non-generic shell)
}
```

**Contract invariants:** state-as-prop (`stage.state`/`effectsState` are the app's — BR-2) · the shell EMITS lifecycle
intents, never writes (the pomodoro-widget precedent) · the stage rail is the shipped `Timeline` (`getTemporalState`
done/current/upcoming + `nowFulcrum`) · the effect log is a read-only `ListView`, polite `role="status"`/list never
`role="alert"` · progress is a `HonestProgress` BAR (EC-5), never a crammed text subtitle · title-hero header with 16px
title→meta rhythm · the semantic type scale only, no arbitrary px (EC-11) · DIRECT semantic tokens · reduced-motion honored ·
degrade-never-crash (every stage/log state renders).

> **⚠ RESOLVED (Envision review, `/contract` ratifies) — the shell OWNS the standardized stage affordances; the consumer owns
> the stage BODY.** The archetype's value is standardizing deliverable-per-stage + attach + mark-done/proof, so the shell
> renders those controls (for the current stage) and emits intents — the consumer's `renderStage` supplies only the
> deliverable CONTENT (description / form). This mirrors the siblings (shell owns chrome/affordances, delegates content
> bodies: collection switcher + renderView, dashboard card-frame + renderBlock) [FACT: collection-view.tsx; dashboard-view.tsx].

> **⚠ OPEN PRECISION (`/contract` decides) — `require-proof` semantics.** `§4.5` is "mark-done OR require proof". Is
> `require-proof` (a) a second completion button the user taps, or (b) a per-stage FLAG that gates `mark-done` behind a
> proof attachment? Proposed: a distinct intent (`onRequireProof`) for the greybox-level contract; the proof-gating flag is
> the consuming flow's config (not this shell's). Ratified at `/contract`.

## Seam B — the session/flow↔FlowSessionView adapter (`apps/web`, pure map + intents + convention; S2)

```ts
// imports @vida/core — lives in apps/web (the Tamagui-only boundary forbids this in @vida/ui).
import { createSessionsService } from '@vida/core' // the FROZEN sessions spine: transition · attach · effect log (ADR-004)
import { isEntityType } from '@vida/core' // the attached-entity identity (schema/_registry.ts)

// THE CONVENTION (shape, not a shipped hook — R3): a consumer composes this to drive FlowSessionView from a session + its
// RESOLVED stages. The "stages" structure is a design-intent extension (quality-bar:139) the CONSUMER resolves from its own
// backend (deliverable_note pages / a stages ext) — this unit does NOT mandate or build that shape (O7).
interface FlowAdapter {
  // map a session row + resolved stages + attachments + the fired-effect log → FlowSessionView props.
  toFlowProps(args: {
    title: string
    context?: ReactNode // the attached-entity identity (isEntityType + the entity row)
    stages: FlowStage[] // RESOLVED by the consumer (backend shape is OUT — O7)
    attachmentsByStage?: Record<string, unknown> // session_attachments / note_attachments, for the attach affordance state
    effects: FlowEffect[] // mapped from the applied_effects log (read-only)
  }): FlowSessionViewProps

  // intent wiring — each binds a Seam-A intent to the FROZEN sessions service (ADR-004 §3.2.2/3.2.3).
  onMarkDone(sessionId: string): Promise<void> // = transition(sessionId, 'complete') → fires the declared effects
  onAttach(sessionId: string, stageId: string, kind: AttachKind): Promise<void> // = attach(...) + note_attachments blob
  onRequireProof(sessionId: string, stageId: string): Promise<void> // the proof flow (consumer-configured)
}
```

**Why pure-pieces + convention, not a live hook (R3):** no _built_ consumer of the Flow shell exists yet — fe-session-runtime
#23, fe-session-hud #16, fe-onboarding #26, fe-check-ins #31 all ship after #11 (grep clean; surface dirs `.gitkeep`). The
Collection/Dashboard/Entity adapters are the exact precedent — real pure code + types + convention ship; only the live
React-Query hook defers [FACT: fe-codec-entity-facet seam-contract Seam B]. So S2 ships `toFlowProps` + the `FlowAdapter`
type + the intent-wiring convention + a mapping/intent test; the live `useFlowSession(sessionId)` hook (React Query over the
session + its attachments + the effect log) is built at the first consumer.

**Boundary facts:** the sessions service + effect rail + `session_attachments` are the SHIPPED frozen contracts the adapter
binds (interpretation §1), never re-invented [FACT: ADR-004-session-framework.md:46-71]; the shell EMITS intents, the adapter
performs the writes (BR-2); the **"stages" backend realization is a design-intent extension homed OUT** (O7) — the adapter
takes resolved `stages` as input, it does not define their storage; the effect WRITES + lifecycle engine live in `@vida/core`
(O4), never here.

## What this contract does NOT cover (homed elsewhere — slice-map "Out of scope")

The timer HUD (region 6 → #16, O1) · the session runtime PAGE (#23, O2) · the countdown widget (pomodoro V5 ✅, O3) · the
effect WRITES + lifecycle engine (`@vida/core` / #32, O4) · the attachment STORAGE + `deliverable_note` pages (`@vida/core`,
frozen, O5) · the sub-type registry / open session types (`@vida/core`, frozen, O6) · per-consumer flow surfaces + the
"stages" backend realization (module ② tracks / a schema amendment, O7).
