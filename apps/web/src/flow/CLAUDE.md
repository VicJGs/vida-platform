# apps/web/src/flow — the Flow/Session ↔ FlowSessionView adapter (fe-codec-flow-session S2)

## What this is

The `apps/web` plane of the CODEC Flow/Session shell (#11). Binds `@vida/ui`'s presentational `FlowSessionView` to the
`@vida/core` sessions service — the Tamagui-only boundary forbids a `@vida/core` import in `@vida/ui` (BR-2). The
collection/dashboard/entity adapter precedent.

## Pattern in use

- **`toFlowProps(src)`** — the typed assembler: a `FlowSource` → `FlowSessionViewProps`. Near pass-through (the shell owns
  progress derivation + degrade), so the real logic lives in the two pieces below.
- **`mapEffectLog(rows)`** — the ADR-004 `applied_effects` ledger (F1) → the shell's read-only effect-rail entries, with
  plain-language labels for the effect catalogue (§3.2.2). Unknown types fall back to their key (never dropped).
- **`bindFlowIntents(port, sessionId, opts)`** — wires the shell's EMITTED intents to a `SessionsPort` (BR-FS-2: the shell
  never writes; here is where the writes happen): mark-done → `transition(id,'complete')` (fires the declared effects),
  attach → `attach(...)` to the consumer-resolved target, require-proof → the consumer's proof flow.
- **`SessionsPort`** — the subset of the `@vida/core` sessions service the flow needs; defined as a PORT (not a concrete
  import) so S2 stays pure + testable. The `@vida/core` edge lives in the deferred hook.
- **`toFlowSource(input)`** (`flow-source.ts`, fe-session-runtime #23 S1) — the pure RAW→`FlowSource` assembler: a
  `SessionLike` (+ its resolved `deliverable_note` page, `session_attachments`, `applied_effects`) → `FlowSource`.
  Single-stage by default (EC-9; the session IS one stage); total `SESSION_STATUS→StageStatus` map (unknown→upcoming
  +dev-warn); proof = skipped/missed label else attachment-count on a done stage; effects via `mapEffectLog`. No
  `@vida/core` import (mirror-by-value inputs — the reader-adapter precedent).
- **`useFlowSession(sessionId)`** (`use-flow-session.ts`, #23 S1 — the FIRST flow consumer, R3) — the data hook.
  **M1 stub** (the sibling discipline: no apps/web `@vida/core` composition root + the worker-RPC `values` seam
  throws, S1-D2/F3): default honest-empty; `?sample` (DEV) seeds a single-stage `FlowSource`; a no-op-safe
  `SessionsPort`; `state: TerminalState` (app canon, structurally assignable to the shell's `ViewState`). The **live
  swap is zero-signature** (documented in the hook header): `useQuery → sessions.getSession + resolveTargets +
applied_effects → toFlowSource`, `deriveTerminalState`, the real service bound to `SessionsPort`.
  Remaining first-consumers reuse it: fe-session-hud #16 / fe-onboarding #26 / fe-check-ins #31.

## Out (homed elsewhere)

The "stages" backend realization is a **design-intent extension** the CONSUMER resolves from its backend (deliverable_note
pages / a stages ext) — OUT of this unit (O7). The effect WRITES + lifecycle engine live in `@vida/core` (#32). The timer
HUD (#16) / runtime page (#23) / countdown (pomodoro V5) are separate units.

## Imports

- `FlowSessionViewProps` / `FlowStage` / `FlowEffect` / `AttachKind` from `@vida/ui` (the shell's Seam A).
- NO `@vida/core` import yet — the sessions-service binding is deferred to the live hook (the entity adapter imported
  `schema` for its registry gate NOW; the flow adapter's `@vida/core` need is the service, which the hook binds).

## Spec

`docs/specs/components/ui-2-platform-views/flow-session-view.md` · delivery `docs/specs/foundation/fe-codec-flow-session/`.
