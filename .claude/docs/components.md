<!-- Last updated: 2026-08-16 by /session-end -->
| Component | Location | Key Props | States Handled | Notes |
|-----------|----------|-----------|----------------|-------|
| `AppShell` | `apps/web/src/shell/app-shell.tsx` | `children` (→ content region / router Outlet), `__bp?` (test/story breakpoint override) | responsive reflow per breakpoint (dock drawer→rail→sidebar · bar condensed→full · Spaces mobile-hidden); mobile drawer open/closed (scrim + transform + inert) | UI-4 · S1+S2. The 5-region shell frame on `shell/regions.ts` predicates + Tamagui `useMedia()`. **Bounded-viewport frame** (`height:100vh`+`overflow:hidden`; dock & content scroll independently). Renders the real S2 nav chrome; overlayHost still empty until S3. Mounts in `routes.tsx` RootComponent. |
| `ModuleDock` | `apps/web/src/shell/module-dock.tsx` | `dock` (DockState), `bp` (Breakpoint) | drawer/rail/sidebar forms; empty-group skip; collapse toggle (sidebar) | UI-4 · S2. Renders `MODULE_MAP` `placement:'dock'` (14 modules) grouped by `ModuleGroup`; `isFeatureEnabled` fail-closed (gamification hidden); rail=icon-only w/ aria-label groups. Composes `Button` + `NavLink`. |
| `GlobalBar` | `apps/web/src/shell/global-bar.tsx` | `mode` ('condensed'\|'full'), `onOpenMobileNav` | condensed (hamburger + search + overflow Menu) / full (Search + surface links) | UI-4 · S2. Renders `GLOBAL_SURFACES`; Search → `commandBar.open()` (S3 renders the overlay). Composes UI-1 `Button`/`Menu` + `NavLink`. |
| `NavLink` | `apps/web/src/shell/nav-link.tsx` | `to`, `label`, `icon?`, `iconOnly?` | default/hover/active/focus-visible; `aria-current` (exact) | UI-4 · S2. A `createLink`-styled real SPA `<a>` (DS-token focus ring/hover/active variants); one `ShellRoute` widening (`href` forbidden; unregistered → NotFound); `lucide-react` icon tints via `currentColor`. Exports `useShellNavigate` for imperative nav. |

## DatabaseAdapter + web-adapter (AR-2 · 2026-07-27 · commit e55010f)
Platform-agnostic SQLite seam (`packages/core/src/db/adapter.ts`) + its browser impl (`apps/web/src/db/`).
- **`DatabaseAdapter`** interface: `open` / `migrate` / `createDrizzle` / `exists` / `destroy`. `SqliteDriver` is the
  per-platform raw-SQL surface (async: `exec`/`run`/`query`/`values`/`batch`/`close`).
- **Async** — wa-sqlite's Factory API is async-only, so `DrizzleDb = SqliteRemoteDatabase<schema>` ('async') built via
  `createDrizzleProxy` (drizzle-orm/sqlite-proxy). Encryption OFF in M1.0 (optional `sqlCipher` seam → M3).
- **Web** (`apps/web/src/db/`): `web-driver.ts` (async driver on wa-sqlite `statements()`), `worker.ts` (Web Worker
  host + in-worker proof), `web-adapter.ts` (`AccessHandlePoolVFS`/OPFS). Runs in a Worker (sync OPFS handles are worker-only).
- Tests: `web-adapter.test.ts` (Node contract over better-sqlite3, 6/6). Browser open/persist proof → LIF-103.
