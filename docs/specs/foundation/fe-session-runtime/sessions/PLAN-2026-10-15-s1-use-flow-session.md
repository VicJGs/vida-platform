# PLAN — fe-session-runtime S1: `toFlowSource` + `useFlowSession` (the data leg)

> Entity Delivery Flow ② · per-step build gate (§XXVI) **gate 1 = this SPEC**. Session 2026-10-15-fe-session-runtime-1.
> Slice S1 of the ratified slice-map. No-Guessing: `[FACT: path:line]` / `[INTERPRETATION]` / `[UNKNOWN]`.
> Plane `apps/web/src/flow` (data edge). **No rendered surface → no Visual Gate** (S2 carries it).

## §1 — Context / baseline (what exists, verified)

- **Shell (shipped, `@vida/ui`):** `FlowSessionView` + `FlowStage{id,label,title,status,state?,proof?}` + `FlowEffect`.
  `[FACT: packages/ui/src/components/flow-session-view.tsx:30-50,52-89]`
- **Adapter (shipped, `apps/web/src/flow/adapter.ts`):** `FlowSource` `[FACT: adapter.ts:29-47]` · `toFlowProps`
  `[:52-70]` · `mapEffectLog(rows)` + `AppliedEffectRow` `[:84-95]` · `SessionsPort{transition,attach}` `[:99-102]` ·
  `bindFlowIntents` `[:113-122]`. **Missing (S1 adds):** the raw-data → `FlowSource` assembler + the live hook.
- **Core service (live, `@vida/core`):** `createSessionsService` → `getSession`/`completeSession`/`transitionSession`/
  `attach` `[FACT: services/sessions/service.ts:120,133,135,411-416]`; `resolveTargets(db,sessionId)` reads
  `session_attachments` `[FACT: foundation/sessions/attachments.ts]`; `Session` type `[FACT: services/sessions/types.ts:85]`.
- **apps/web M1 constraint (doc-fixed, repo-wide):** no `@vida/core` composition root + the worker-RPC Drizzle `values`
  seam throws → the live data leg is DEFERRED; hooks ship shape + `?sample` DEV seed + zero-signature live-swap.
  `[FACT: notes/use-note-entity.ts:4-5; notes/use-attachments.ts:1-10; collection/use-collection.ts:7-14]`
- **Sibling precedent to mirror:** `apps/web/src/reader/` — pure assembler (`toReaderProps`) + Port + a DEFERRED live
  `useReader` hook. `[FACT: reader/CLAUDE.md:8-36]`

## §2 — Business rules (invariants S1 must hold)

- **BR-1 — no `@vida/core` service import in `@vida/ui`** (Tamagui-only, BR-2). The `@vida/core` edge is the hook ONLY.
  `[FACT: flow/CLAUDE.md:5,29-30]`
- **BR-2 — the hook never writes directly**; writes go through `SessionsPort` via `bindFlowIntents` (IR-1). `[adapter.ts:110-113]`
- **BR-3 — stages are assembled from EXISTING primitives, no new plumbing** (frontend-quality-bar §4.5). Single-stage
  by default (EC-9): the session IS one `current` stage; a `completed` session → one `done` stage; the deliverable =
  its `deliverable_note` page; `proof` from `session_attachments`. Multi-stage is a driving module's concern (O7), not S1.
  `[FACT: decomposition.md:70; frontend-quality-bar:134-140; slice-map O7]`
- **BR-4 — unknown effect types fall back to their key, never dropped** (reuse `mapEffectLog`). `[FACT: adapter.ts:91-94]`
- **BR-5 — degrade-never-crash:** a missing/unreadable session → the hook returns `state:'error'` (or `'empty'` when no
  id), never a throw; the assembler returns an honest partial, never a guessed stage (the reader `resolveLocation` bar).
  `[FACT: reader/CLAUDE.md:12-13]`
- **BR-6 — zero-signature live-swap:** the hook's public signature is final now; the live swap only replaces the M1
  seed body with `useQuery(...) → service calls`. Documented in the hook header. `[FACT: use-attachments.ts:1-10]`

## §3 — Contract (the shapes S1 ships)

```ts
// apps/web/src/flow/flow-source.ts  (new — the pure assembler; the reader-mapper precedent)
/** Raw inputs the live hook will later fetch; mirror-by-value of the @vida/core shapes (no @vida/core import here). */
export interface SessionLike {
  id: string
  sub_type: string
  status: string
  started_at?: number | null
}
export interface DeliverableLike {
  title: string
  description?: string
} // from the deliverable_note page (O5 READ)
/** Assemble a FlowSource from raw session data. Single-stage default (EC-9); proof from attachments; effects via mapEffectLog. */
export function toFlowSource(input: {
  session: SessionLike
  deliverable?: DeliverableLike
  attachments?: readonly { id: string; filename: string }[]
  effects?: readonly AppliedEffectRow[]
}): FlowSource

// apps/web/src/flow/use-flow-session.ts  (new — the hook; mirrors useReader/useAttachments)
export interface UseFlowSession {
  source: FlowSource | null
  port: SessionsPort
  state: TerminalState
}
export function useFlowSession(sessionId: string): UseFlowSession
//  M1: default state 'empty' (no live composition root); `?sample` (DEV) → a seeded single-stage FlowSource.
//  port: a no-op-safe SessionsPort in M1 (transition/attach resolve to a logged no-op until the live swap).
//  Live swap (zero-signature): useQuery(['session',id],()=>sessions.getSession(id)) + resolveTargets + applied_effects
//    → toFlowSource(...); port = bound to the real createSessionsService.
```

**Status → StageStatus mapping (R1 — total, no unmapped status):** `SESSION_STATUS` `[FACT: packages/types/src/session.ts
SESSION_STATUS]` → `StageStatus`:

- `in_progress` → `current` · `completed` → `done` (+ attachment-derived `proof`) · `scheduled`/`planned`/`rescheduled`
  → `upcoming` · `skipped`/`missed` → `done` with `state:'error'`-free but a muted `proof:"Skipped"`/`"Missed"` label
  (honest, not a crash; the stage still renders). Any future/unknown status → `upcoming` + a dev-warn (degrade, BR-5).

**State type (R2 — CORRECTED after preflight: `ViewState` is NOT exported by `interaction-state.ts`).** The app-canon
terminal union is **`TerminalState`** = `['loading','empty','error','success']` `[FACT: packages/core/src/foundation/
capability/types.ts:13-14]`, re-exported for the web layer by `apps/web/src/state-conventions/terminal-state.ts` along
with **`deriveTerminalState<T>(queryResult)`** (React-Query result → `TerminalState`) `[FACT: terminal-state.ts:18,50]`.

- The hook returns `state: TerminalState` imported from `./state-conventions/terminal-state` (NOT `@vida/ui`'s
  `ViewState`, which is `@vida/ui`'s LOCAL structural mirror `[FACT: packages/ui/src/internal/data-view.tsx:11]`).
- `TerminalState` is **structurally assignable** to `FlowSessionViewProps`' `ViewState` fields (same 4 members) — the
  documented no-import boundary `[FACT: packages/ui/src/CLAUDE.md "deriveTerminalState()'s value assignable with no import"]`.
- The live-swap derives state via `deriveTerminalState(useQuery(...))`; M1 default = `'empty'`.

**Stage title/label fallback (preflight gap 2):** single-stage default — `label` = `"Stage 1"`; `title` = the
`deliverable.title`, else the humanized `session.sub_type` (e.g. `work` → "Work session") when no deliverable page is
resolved. Never blank, never a guessed deliverable (BR-5).

**M1 port behavior (N1):** the M1 `SessionsPort` is a logged no-op, so `mark-done`/`attach` render but do not mutate.
S2's Visual Gate therefore asserts affordance **PRESENCE** (structural EC-2), NOT stage-advance (EC-10 is `feel`,
live-deferred). S2 MAY add a local optimistic advance for the feel demo, but S1's port stays a no-op.

- The `?sample` seed = one `current` stage ("Draft the outline"), a sample deliverable description, 1 sample attachment,
  2 sample effect rows (`log_time`, `award_xp`) → exercises EC-1/EC-2/EC-4/EC-9 on the page gate.

## §4 — Acceptance (how S1 is done)

- `tsc --noEmit` 0 · `eslint` 0 (full `@vida/core`+`apps/web` as the sibling slices run).
- Unit tests (Vitest), business-logic 100% (§XIX): `toFlowSource` — single-stage default · completed→done+proof ·
  unknown-effect fallthrough · degrade (missing deliverable/attachments) ; `useFlowSession` — M1 empty default ·
  `?sample` seeds a valid FlowSource · port no-op is call-safe.
- The hook header documents the live-swap (BR-6); no `@vida/core` import added to `@vida/ui` (BR-1).
- Currency (§XXIX) deferred to end-of-unit (after S2) — S1 commits with its tests.
- **No Visual Gate** (data leg; sibling-hook precedent).

## §5 — Implementation prompt (ordered — for the IMPLEMENTATION-PLAN / gate 2)

1. `apps/web/src/flow/flow-source.ts` — types (`SessionLike`/`DeliverableLike`) + `toFlowSource` (single-stage default,
   proof from attachments, `mapEffectLog` for effects).
2. `flow-source.test.ts` — the 4 assembler cases above.
3. `apps/web/src/flow/use-flow-session.ts` — the hook: reuse the exact `devSampleActive()` idiom
   (`NODE_ENV!=='production' && window && searchParams.has('sample')`) `[FACT: notes/use-attachments.ts:28-34]` →
   `?sample` seeds the FlowSource; M1 empty default; a no-op-safe `SessionsPort`; `state: TerminalState` (M1 `'empty'`);
   header documents the zero-signature live swap (`deriveTerminalState(useQuery(...))`).
4. `use-flow-session.test.ts` — empty default · `?sample` · port call-safe.
5. Update `apps/web/src/flow/CLAUDE.md` — note the live hook + assembler now exist (the first consumer, R3).
6. `tsc`/`eslint`/tests green → commit `feat(flow): useFlowSession + toFlowSource (fe-session-runtime S1)`.

## Open / flagged

- `[UNKNOWN]` the exact `deliverable_note` page read (how S2 resolves the current stage's deliverable page) — belongs to
  **S2** (the page wires `attachTarget`/deliverable lookup); S1's assembler just accepts a `DeliverableLike`.
- No `[DEFERRED]` invented — the only deferral is the repo-wide live data leg (BR-6), doc-fixed.
