# fe-session-runtime (#23) — Seam Contract

> The service API the runtime page consumes. The shell's **Seam A** (props) + adapter's **Seam B** (intents) are
> SHIPPED; this contract fixes **Seam C** — the live `@vida/core` edge the `useFlowSession` hook (S1) binds.

## Seam A — the shell props (SHIPPED, `@vida/ui`)

`FlowSessionViewProps` `[FACT: packages/ui/src/components/flow-session-view.tsx:52-89]` ·
`FlowStage{id,label,title,status,state?,proof?}` `[:30-42]` · `FlowEffect` `[:44-50]`. Consumed via `toFlowProps`.

## Seam B — the intent wiring (SHIPPED, `apps/web/src/flow/adapter.ts`)

`bindFlowIntents(port, sessionId, { attachTarget?, onProof? })` `[FACT: adapter.ts:113-122]` →
`onMarkDone`→`port.transition(id,'complete')` · `onAttach`→`port.attach(...)` · `onRequireProof`→`opts.onProof`.
`mapEffectLog(rows)` `[FACT: adapter.ts:93-95]` · `FlowSource` `[FACT: adapter.ts:29-47]`.

## Seam C — the live `@vida/core` edge (S1 BUILDS this; the deferred piece)

The hook binds the real sessions service to the shipped **`SessionsPort`** `[FACT: adapter.ts:99-102]`:

```ts
// apps/web/src/flow/use-flow-session.ts  (S1 — the first consumer, R3)
function useFlowSession(sessionId: string): {
  source: FlowSource // title · stages (assembled) · effects (mapEffectLog) · context
  port: SessionsPort // { transition, attach } — bound to @vida/core
  state: ViewState // loading | empty | error | success
}
```

**Reads (frozen `@vida/core`, READ-only):** the `sessions` row · `session_attachments` · the local
`applied_effects` ledger. **Writes:** via `SessionsPort` only (Seam B) — the page never writes directly (IR-1).

**Stages assembly (no new plumbing — frontend-quality-bar §4.5, O5/O7):** `FlowStage[]` from existing primitives —
single-stage default (the session itself; EC-9); `proof` from `session_attachments`; `status` from the session's
lifecycle state. Multi-stage structure is a driving module's concern (O7), not #23.

**M1 reality — TWO layers (both verified; corrects two earlier mis-statements of mine):**

- **`@vida/core` layer = LIVE.** `createSessionsService` ships `getSession`/`completeSession`/`transitionSession`/
  `attach` `[FACT: services/sessions/service.ts:120,133,135,411-416 — LIF-139 S1]`, routing completion through the
  **built #32 transition engine** (validates the move, fires declared effects, records the `applied_effects` ledger,
  commits status last) `[FACT: foundation/sessions/lifecycle.ts:62-134, shipped 2026-09-17]`; the effect rail is built
  `[FACT: foundation/effects/service.ts]`. Deferred here = only per-module effect HANDLERS + scheduler (#46/MOD-\*),
  which don't block #23 `[FACT: foundation/sessions/CLAUDE.md]`.

- **`apps/web` layer = DATA LEG DEFERRED (the binding constraint for #23).** The web app **cannot call that service
  live in M1**: there is **no `@vida/core` service composition root for apps/web**, and a live query **throws on the
  worker-RPC Drizzle `values` seam** (S1-D2 / F3). This is the DOC-FIXED pattern shared by EVERY sibling hook
  `[FACT: apps/web/src/notes/use-note-entity.ts:4-5]` `[FACT: apps/web/src/notes/use-attachments.ts:1-10]`
  `[FACT: apps/web/src/collection/use-collection.ts:7-14]`.

⇒ **S1 follows the sibling pattern exactly:** `useFlowSession(sessionId)` ships the **shape + convention**, with
M1 default = empty/degraded and a **`?sample` DEV param** seeding a `FlowSource` (single-stage sample session +
sample attachments + sample effect log) for the gate. The **live swap is zero-signature-change** and documented in
the hook header:
`const {data}=useQuery(['session',id],()=>sessions.getSession(id)); source=toFlowSource(data, resolveTargets(id), appliedEffects(id))`
— dropped in once the composition root + worker `values` seam land. `[FACT: use-attachments.ts "Live swap (zero
signature change)" header]`
`[FACT: foundation/sessions — `encryptedFields:[]` M1.0 vault-locked pass-through seam; ADR-017:20]`

## Non-negotiables inherited

- `@vida/ui` stays Tamagui-only; the `@vida/core` import lives ONLY in the hook (IR-2).
- Unknown effect types fall back to their key, never dropped (IR-4).
- Degrade-never-crash per-stage/per-surface state (IR-5).
