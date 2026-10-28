# apps/web/src/session-runtime — the Session runtime page (fe-session-runtime #23, S2)

## What this is

The routed Session runtime page (`/sessions/$id`) — the first real consumer of the Flow/Session codec seam. Renders
ONE session as a deliverable-per-stage flow via the shipped `@vida/ui` `FlowSessionView`. Codec-tier reuse: later
consumed by Sessions #34 / Health / Pomodoro (reconstructed-structure.md:88).

## Pattern in use

- **`session-runtime-surface.tsx`** — the ROUTER-FREE surface (`sessionId` prop). Owns the page-level terminal-state
  ladder (loading/empty/error via a local `Centered` host; the note-entity precedent); on success composes
  `FlowSessionView` from `useFlowSession` via `toFlowProps` + `bindFlowIntents`. The shell never writes — intents bind
  to the `SessionsPort` here (BR-2). The effect rail ALWAYS renders (teaching-empty when none, EC-4).
- **`session-runtime-page.tsx`** — the thin ROUTED wrapper: `getRouteApi('/sessions/$id').useParams()` →
  `<SessionRuntimeSurface>`. Default export for `lazyRouteComponent` (the /notes/$id precedent). Registered in
  `routes.tsx` (lazy-split, BR-RT-8).
- **The split exists for the Visual Gate:** the surface is router-free so the standalone gate entry mounts it directly
  (a router-bound component can't be gated standalone). See the S2 PLAN.

## Data / M1 reality

- Data is the S1 `useFlowSession` stub: M1 honest-empty by default; `?sample` (DEV) seeds a single-stage session.
  The live swap is zero-signature (no apps/web `@vida/core` composition root + the worker `values` seam throws — S1-D2).
- `attachTarget`/`onProof` are M1 stubs (no live `deliverable_note` target; proof-capture + stage-advance feel are
  live-deferred — EC-10). Multi-stage (EC-1/EC-3) is a driving module's concern (O7); #23 renders single-stage (EC-9).

## Spec

`docs/specs/foundation/fe-session-runtime/` (delivery/ + sessions/PLAN-\*-s2-runtime-page.md). Shell spec:
`docs/specs/components/ui-2-platform-views/flow-session-view.md`.
