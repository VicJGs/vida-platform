# apps/web/src/notifications — the Notifications surface (fe-notifications ② · LIF-192)

The `/notifications` route: the System's out-loud voice as a **multi-lens** surface — the user picks how
they hear it (Margin · Dispatches · Constellation). ② UI/UX over the finished `mod-notifications` ①; no
`@vida/core`/`@vida/types` change. Mounts into the shipped global `/notifications` Bell nav link.

## Files
- **`attention-model.ts`** — PURE. `toAttentionModel(rows, upcoming, now)` → `{ anticipated, settled, byArea }`;
  resolves relative time, severity marker (token + `warm` for error/warning only — EC-5), NOT-25 `dangling`,
  System voice, life-area. The ONE model the three lenses render. The `@vida/core`↔`@vida/ui` crossing lives
  here (apps/web), the collection-adapter precedent (BR-2).
- **`use-notifications.ts`** — the DATA seam. M1 honest-**empty** + `?sample` DEV populate + `?force=loading|error`
  gate hook. Live swap = React Query over `NotificationsService.list()/unreadCounts()` + Sessions `dueIn()` for
  anticipations — drop-in, deferred to the first consumer (the notes-surface precedent).
- **`use-notification-lens.ts`** — the user's chosen lens, persisted **locally** (localStorage; `?lens=` gate
  override). NOT a `@vida/core`/Preferences field — keeps this unit frontend-only. Default = `margin`.
- **`lens-margin.tsx`** — S1 flagship: the time-spine + now-line; anticipations above (hollow/faded), settled
  below; quiet severity; NOT-25 dangling; entity chips; per-row lifecycle.
- **`notifications-surface.tsx`** — the route (default export): chrome (title · derived unread badge ·
  mark-all-read) + lens switcher + All/Unread/Archived status filter + 8-state + **optimistic-local** lifecycle.

## Key invariants (why, not what)
- **Anticipations are NOT notification rows.** The dispatcher never writes a row before fire time (NF-3, no
  phantom future inbox) — "above now" derives from the Sessions `dueIn` agenda. `[FACT: BR-NT-S4-3]`
- **Honest-empty + deferred-live.** No live composition root yet (worker-RPC Drizzle `values` seam would
  throw); reads/writes bind at the first consumer. M1 lifecycle is **optimistic-local** (session-only, resets
  on reload) — never a faked "saved".
- **Badge is derived**, never stored (unread count from the rows). `[FACT: BR-NT-S1-6]`
- **Severity = shape + token, not hue alone** (EC-5); AA holds across 3 presets × light/dark incl. warm/olive
  dark (title 15.8–17.3 · voice/chip 4.9–6.5 — Visual Gate). The surface inherits the AppShell's
  `$colorSurfacePrimary` background (the gate harness paints it to match prod).

## Lenses (all built — the user chooses via the switcher)
- **`lens-margin.tsx` — The Margin** (default): time-spine + now-line.
- **`lens-dispatches.tsx` — Dispatches**: serif briefing, narrative groups (Today / Earlier / Still ahead).
- **`lens-constellation.tsx` — Constellation**: life-area hubs + severity-dotted orbits + "you" at center.
  **§XXVIII deviation** (slice-map said "shipped NeuralGraph"): a CSS/SVG constellation — a Sigma/WebGL
  force graph is built for 10K nodes + carries the WebGL color seam; for ~8 hubs the CSS/SVG map is lighter
  and IS the greybox Victor approved. Live drill-down (tap area → its alerts) deferred with the data plane.

## Verify
- Unit: `pnpm --filter @vida/web test -- notifications` (pure model).
- Visual Gate: Brave via `playwright-core` over the real surface in the standalone harness
  (`src/__envision__/`, `?real=1&sample&preset=…&mode=…`) — the throwaway harness is removed before the PR.
