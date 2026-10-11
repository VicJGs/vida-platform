// ============================================================================
// Router — AR-4 (LIF-75). Code-based TanStack Router tree (ADR-001; the docs
// mandate a central routes.tsx, not file-based routing — performance-strategy §6).
// Module-scope `router` singleton so StrictMode's dev double-invoke can't spawn
// duplicates (R5). Route-based lazy code-splitting via `lazyRouteComponent`
// (BR-RT-8): each top-level route's component is its own async chunk.
//
// AR-4 ships the tree + a root route + a not-found + ONE lazy reference route
// (/graph). Per-module routes land with each module's own wave (M1.1+).
// ============================================================================

import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Link,
  Outlet,
} from '@tanstack/react-router'
import { AppShell } from './shell/app-shell'
import { CommandBar } from './shell/command-bar'
import { HomeSurface } from './home/home-surface'

const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

// UI-4 · S1: the app-shell chrome wraps the routed content. AppShell mounts HERE (inside the router) — not above
// <RouterProvider> — because it hosts the <Outlet/>, which is only legal inside a route component.
// fe-shell #14 · S2: the ⌘K launcher rides the frame's `overlaySlot` (envision #17; "⌘K reuses ui-4/ux-2"). CommandBar
// owns its own global keybind + self-portals to <body>, so it keeps working through the dock⇄float reshape.
function RootComponent() {
  return (
    <AppShell overlaySlot={<CommandBar />}>
      <Outlet />
    </AppShell>
  )
}

function NotFoundComponent() {
  return (
    <div>
      <h1>404 — Not found</h1>
      <Link to="/">Home</Link>
    </div>
  )
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  // fe-home #18 · S3: the Home surface renders inside the UI-4 shell <Outlet/> (home-journal-dashboard.md:9,63).
  component: HomeSurface,
})

// UI-4 · S5 — the neural-graph route is lazy-split so sigma/graphology never enter the
// initial bundle (BR-7; performance-strategy.md §6). The lazy-route reference pattern.
const graphRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/graph',
  component: lazyRouteComponent(() => import('./app/graph')),
})

// fe-notes-and-pages #27 · S1 — the Notes Top view (lazy-split, the /graph precedent; BR-RT-8).
const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes',
  component: lazyRouteComponent(() => import('./notes/notes-surface')),
})

// fe-notes-and-pages #27 · S2 — the note-entity page (editor-led frame + Layout-facet slot), lazy-split.
const noteEntityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes/$id',
  component: lazyRouteComponent(() => import('./notes/note-entity')),
})

const routeTree = rootRoute.addChildren([indexRoute, graphRoute, notesRoute, noteEntityRoute])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

// Type-safety registration (TanStack Router v1).
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
