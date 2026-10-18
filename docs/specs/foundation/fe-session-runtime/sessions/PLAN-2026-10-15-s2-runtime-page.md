# PLAN — fe-session-runtime S2: the runtime page + route

> Entity Delivery Flow ② · per-step build gate (§XXVI) **gate 1 = this SPEC**. Session 2026-10-15-fe-session-runtime-1.
> Slice S2 of the ratified slice-map. No-Guessing: `[FACT: path:line]` / `[INTERPRETATION]` / `[UNKNOWN]`.
> Plane `apps/web/src/session-runtime` + `routes.tsx`. **Carries the blocking per-slice Visual Gate** (EC-1…EC-11).

## §1 — Context / baseline (verified)
- **S1 shipped** (`1e9f2e2`): `useFlowSession(id) → {source, port, state:TerminalState}` + `toFlowSource`.
  `[FACT: apps/web/src/flow/use-flow-session.ts, flow-source.ts]`
- **Shell + adapter shipped:** `FlowSessionView` `[FACT: flow-session-view.tsx:52-89]`; `toFlowProps`/`bindFlowIntents`
  `[FACT: flow/adapter.ts:52-70,113-122]`.
- **Routing pattern (the `/notes/$id` precedent):** code-based TanStack Router; a `createRoute({getParentRoute:()=>rootRoute,
  path:'/sessions/$id', component: lazyRouteComponent(() => import('./session-runtime/session-runtime-page'))})` added to
  `rootRoute.addChildren([...])`; param via `getRouteApi('/sessions/$id').useParams()`. `[FACT: routes.tsx:71-74,85]`
- **Page pattern (the `note-entity.tsx` precedent):** the SURFACE owns the terminal-state ladder (a `Centered` host:
  loading skeleton `aria-busy` · empty teaching · error `role="status"` muted) BEFORE the frame; success → the shell.
  A `?flag` dev affordance (`NODE_ENV!=='production' && searchParams.has(flag)`) mounts gate overlays.
  `[FACT: notes/note-entity.tsx:16-70]`

## §2 — Business rules
- **BR-1 — the SURFACE owns the page-level terminal states** (loading/empty/error) via the `Centered` host; the shell
  renders only on `success`. `[FACT: note-entity.tsx:47-70]`
- **BR-2 — the shell never writes** (IR-1): the page binds intents via `bindFlowIntents(port, id, {attachTarget, onProof})`
  and spreads them into `toFlowProps`. `[FACT: adapter.ts:113-122]`
- **BR-3 — no new plumbing** (frontend-quality-bar §4.5): `attachTarget` resolves the deliverable's `deliverable_note`
  page / `note_attachments` target (O5 READ); in M1 (no composition root) it returns a `?sample` stub target or `undefined`
  (→ `bindFlowIntents` safely skips the attach). `onProof` = a no-op stub in M1 (the proof-capture flow is a driving
  module's; EC-10 feel is live-deferred). `[FACT: adapter.ts:104-108,117-120]`
- **BR-4 — lazy-split route** (BR-RT-8, the `/graph`,`/notes` precedent): the page is its own async chunk. `[FACT: routes.tsx:57-60]`
- **BR-5 — degrade-never-crash**: `state:'empty'` (M1 default, no live data) → a teaching empty, NOT a blank or a crash.

## §3 — Contract (what S2 ships)
```
apps/web/src/session-runtime/
  session-runtime-page.tsx      // thin ROUTED wrapper (default export for lazyRouteComponent)
  session-runtime-surface.tsx   // the presentational surface — ROUTER-FREE (gated standalone)
  session-runtime-surface.test.tsx
  CLAUDE.md
```
**The split (preflight-driven):** the routed page reads the param; the SURFACE holds all logic and renders without the
router — so the standalone Visual-Gate entry can mount it directly (the router-bound page can't be).
```tsx
// session-runtime-page.tsx — thin routed wrapper
const routeApi = getRouteApi('/sessions/$id')
export function SessionRuntimePage() { return <SessionRuntimeSurface sessionId={routeApi.useParams().id} /> }
export default SessionRuntimePage

// session-runtime-surface.tsx — the surface (router-free; what the gate mounts)
export function SessionRuntimeSurface({ sessionId }: { sessionId: string }) {
  const { source, port, state } = useFlowSession(sessionId)
  if (state === 'loading') return <Centered busy>…skeleton…</Centered>
  if (state === 'error')   return <Centered role="status">…calm error…</Centered>
  if (state === 'empty' || !source) return <Centered><EmptyState title="No session open" …/></Centered>
  const intents = bindFlowIntents(port, sessionId, { attachTarget, onProof })
  const effects = source.effects ?? []
  return <FlowSessionView {...toFlowProps({ ...source, ...intents, effects,
    effectsState: effects.length > 0 ? 'success' : 'empty' })} aria-label={source.title} />
}
```
- Route: add `sessionRuntimeRoute` (`/sessions/$id`, lazy → `session-runtime-page`) to `routes.tsx` + `rootRoute.addChildren`.
- `Centered` host: local copy of the `note-entity.tsx` file-local pattern (not exported there; shared extraction is a
  rule-of-three concern, not now). `[INTERPRETATION]`
- `attachTarget`/`onProof`: M1 stubs (sample target / no-op); the live wiring rides the zero-signature hook swap.
- **Effect-rail empty handling (R1 — EC-4):** the shell renders the rail only if `effects` is provided, so the page
  ALWAYS provides it: `effects: source.effects ?? []` + `effectsState: (source.effects?.length ?? 0) > 0 ? 'success' :
  'empty'`. A session with no fired effects → the teaching `EmptyState` rail, never a blank/omitted rail.
  `[FACT: flow-session-view.tsx:79-82 — "the rail renders iff effects is provided"; empty → teaching EmptyState]`

## §4 — Acceptance
- `tsc` 0 · `eslint` 0 · unit test (Vitest jsdom): the state ladder (loading/empty/error/success render paths) + that
  `?sample` renders the `FlowSessionView` region named by the source title.
- **BLOCKING Visual Gate — harness PINNED (standalone vite entry bypass, preflight):** NOT drive-the-real-app
  (onboarding/DB-gate is brittle — cost siblings 2 iterations). Instead a throwaway `apps/web/session-runtime.html`
  (mirror index.html's Tamagui `process` shim `window.process ||= {env:{NODE_ENV}}`) + `src/__envision__/session-runtime-main.tsx`
  = `createRoot().render(<UIProvider selection={fromURL}><SessionRuntimeSurface sessionId="sample" /></UIProvider>)`,
  preset/mode driven by URL params (single `UIProvider selection` prop runs `applySelection` — no class-replication),
  `?sample` seeds the hook. Serve at `localhost:5173/session-runtime.html?sample&preset=<p>&mode=<m>`; Brave via
  playwright-core (`node_modules/.pnpm/playwright-core@*`, CJS default import); `setViewportSize` 375/768/1440. Build all
  workspace dists first (done). Delete the html + `__envision__/` + driver after PASS.
  `[FACT: memory/apps-web-visual-gate-standalone-entry-bypass; apps-web-visual-gate-drive-real-app]`
  Gate asserts (× 3 presets × light/dark × 375/768/1440 + axe):
  - EC-9 single-stage reads sanely · EC-2 current-stage deliverable + attach + mark-done/proof affordances PRESENT ·
    EC-4 effect-rail log (2 effects) + teaching empty · EC-5 title-hero header · EC-7 reflow 375/768/1440 no overflow ·
    EC-8 dark designed + preset accent flips · EC-11 semantic type scale — **× 3 presets × light/dark × 375/768/1440 + axe 0**.
  - **EC-1/EC-3 (multi-stage done/upcoming progression) are SHELL-INHERITED** — #23 produces single-stage generically
    (O7), so they are NOT re-exercised here; proven at the shell gate (#11). Stated, not silently omitted.
  - **EC-10 (stage-advance feel) is live-deferred** — M1 port is a no-op; the gate asserts affordance PRESENCE, not advance.
  - Victor reviews the gate screenshots before PASS. `[FACT: memory/visual-gate-needs-victor-review-before-pass]`
- Currency (§XXIX): refresh `docs/modules/.../current-*` for the session-runtime context at unit close (after S2).
- **Coverage boundary (stated):** the thin routed wrapper (`routeApi.useParams()` → surface) + the `routes.tsx`
  registration are a trivial pass-through + config — verified by `tsc` + the `/notes/$id` precedent (whose route is
  likewise not unit-route-tested), NOT by a bespoke router test. All tested/gated logic lives in the surface.

## §5 — Implementation prompt (ordered)
1. `session-runtime-surface.tsx` — the router-free surface (`useFlowSession` → state ladder → `bindFlowIntents` +
   `toFlowProps` with the EC-4 effect-rail default → `FlowSessionView`); local `Centered` host.
2. `session-runtime-page.tsx` — the thin routed wrapper (`routeApi.useParams()` → `<SessionRuntimeSurface>`); default export.
3. Register `/sessions/$id` (lazy → `session-runtime-page`) in `routes.tsx` + `rootRoute.addChildren`.
4. `session-runtime-surface.test.tsx` (jsdom) — state-ladder paths + `?sample` renders the named region + effect-rail present.
5. `apps/web/src/session-runtime/CLAUDE.md` — the surface layer doc.
6. `tsc`/`eslint`/unit green → **Visual Gate** via the standalone entry (§4; capture screenshots; Victor review) →
   delete the throwaway harness → commit.
7. **Currency (§XXIX)** — birth `docs/modules/<ctx>/current-{spec,business-rules}.md` for the session-runtime context
   (unit close, after S2); commit WITH code.

## Open / flagged
- `[UNKNOWN]` the exact Spaces-scope mount for `/sessions/$id` (bar/nav placement) — design-pass-open per ADR-006:130
  `[FACT: frontend-quality-bar:150-151]`; M1 the route exists + is reachable directly, nav placement rides the HUD (#16).
- No `[DEFERRED]` invented — attach/proof/advance live-wiring is the repo-wide data-leg deferral (S1 BR-6).
