// ============================================================================
// Canonical nav / module map — UX-1 (LIF-90). The single source of truth for
// WHAT modules exist, WHERE they sit in navigation, and HOW they are reached.
//
// This is central DATA, read by the nav chrome (UI-4) and by each module's
// route wiring when it lands (M1.1+). It is NOT a per-module self-registration
// seam — AR-4 resolved the router as a single central `routes.tsx` with no
// self-registration (web-client-runtime/current-spec.md:88-89). This file does
// NOT import or mutate `routes.tsx`, and registers no routes itself.
//
// Nav model = CO-PRIMARY DUAL-AXIS (Victor, 2026-08-01):
//   • module dock  = content home  (the fixed, grouped module nav)
//   • Spaces bar   = cross-cutting overlays (tags + saved views over entities)
// Ownership rule: the dock owns canonical content homes; the Spaces bar overlays,
// never replacing a module home. This AMENDS ADR-007:88 (nav placement → Preferences)
// by fixing the Spaces axis at IA level; ADR-006 §3.4 ("a Space is nav-addressable")
// is the cover. See docs/core/architecture/information-architecture.md.
// ============================================================================

export type ModuleGroup =
  | 'integration'
  | 'productivity'
  | 'knowledge'
  | 'personal-growth'
  | 'life-management'
  | 'platform-services'

// dock        = top-level content home (a primary dock item)
// global      = always-present cross-cutting surface (owned by a module, reached from anywhere)
// secondary   = a reachable standalone page, but surfaced within another realm's flow (not a dock item)
// non-nav     = lives entirely inside another realm (no nav entry of its own)
// spaces-only = reached via the Spaces axis; dissolved into Spaces, not a module
export type NavPlacement = 'dock' | 'global' | 'secondary' | 'non-nav' | 'spaces-only'

export interface ModuleNavEntry {
  /** canonical module key (matches system-overview §2 / core `services/<key>`) */
  key: string
  /** display label */
  label: string
  /** system-overview §2 grouping — drives dock ordering */
  group: ModuleGroup
  placement: NavPlacement
  /** conditional-dock: the feature flag that must be ON to show it (e.g. 'feature_gamification') */
  visibleWhen?: string
  /** route for dock/global/secondary; null for non-nav/spaces-only. UX-facing — MAY differ from `key`. */
  routePath: string | null
  /** for non-nav/secondary/spaces-only: the realm it lives in (e.g. 'sessions', 'knowledge', 'home', 'a-space') */
  homeOwner: string | null
  /** the module exposes per-entity standalone pages */
  hasStandalonePages: boolean
  /** the top view has user-selectable modes (specific modes are NOT enumerated here — per-module VIEWS review, M1.1+) */
  hasMultiModeTopView: boolean
}

// The two co-primary axes. The Spaces bar is a DESIGNED SEAM in M1.0 and goes live when Spaces is built (M1.1).
export const NAV_AXES = {
  moduleDock: { role: 'content-home', primary: true },
  spacesBar: { role: 'cross-cutting-overlays', primary: true, seam: true, livesFrom: 'M1.1' },
} as const

// NOTE — system-overview §2 also lists 8 FOUNDATION SUBSTRATES (Spaces & Tags, Sessions, Measurability, Points
// Economy, Saved Views, Review Engine, Capability Registry, Ingestion & AI). These are cross-cutting primitives,
// NOT dock modules: Spaces = the second nav axis (NAV_AXES.spacesBar); Sessions = a dock surface (agenda) + owns
// the global /calendar; Points Economy surfaces as Gamification (conditional dock). Measurability, Saved Views,
// Review Engine, Capability Registry, and Ingestion & AI have NO nav presence — they power modules, not navigation.
// Only modules whose route is registered in routes.tsx are listed here (check:no-stub-nav, LIF-351); a dock module
// whose route is not built yet waits in PENDING_MODULES (pending-modules.ts).
export const MODULE_MAP: readonly ModuleNavEntry[] = [
  // — Integration —
  {
    key: 'notes',
    label: 'Notes',
    group: 'integration',
    placement: 'dock',
    routePath: '/notes',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
  {
    key: 'journals',
    label: 'Home',
    group: 'integration',
    placement: 'global',
    routePath: '/',
    homeOwner: 'home',
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },

  // — Productivity —
  {
    key: 'tasks',
    label: 'Tasks',
    group: 'productivity',
    placement: 'dock',
    routePath: '/tasks',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
  // Pomodoro = Focus Mode inside the Sessions realm; explicitly "not a standalone module / not a sub-context". [pomodoro/identity.md:6,41]
  {
    key: 'pomodoro',
    label: 'Focus',
    group: 'productivity',
    placement: 'non-nav',
    routePath: null,
    homeOwner: 'sessions',
    hasStandalonePages: false,
    hasMultiModeTopView: false,
  },

  // — Knowledge —
  // Flashcards = a study-method service inside Knowledge; explicitly "not its own module". [flashcards/identity.md:3,38]
  {
    key: 'flashcards',
    label: 'Flashcards',
    group: 'knowledge',
    placement: 'non-nav',
    routePath: null,
    homeOwner: 'knowledge',
    hasStandalonePages: false,
    hasMultiModeTopView: false,
  },

  // (Personal Growth and Life Management have no built route yet: see pending-modules.ts.)

  // — Platform Services —
  // Gamification = CONDITIONAL dock: opt-in; the System dashboard shows only when the flag is on. [gamification/identity.md:8,43]
  {
    key: 'gamification',
    label: 'Gamification',
    group: 'platform-services',
    placement: 'dock',
    visibleWhen: 'feature_gamification',
    routePath: '/gamification',
    homeOwner: null,
    hasStandalonePages: false,
    hasMultiModeTopView: true,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    group: 'platform-services',
    placement: 'global',
    routePath: '/notifications',
    homeOwner: null,
    hasStandalonePages: false,
    hasMultiModeTopView: false,
  },
  {
    key: 'preferences',
    label: 'Settings',
    group: 'platform-services',
    placement: 'global',
    routePath: '/settings',
    homeOwner: null,
    hasStandalonePages: false,
    hasMultiModeTopView: false,
  },

  // — Spaces-only (DISSOLVED into the Spaces axis, not modules — system-overview §2 lists them, but they resolve to
  //   Spaces per features/README + intake). Duties also dissolved → Tasks TYPES (no row; not a §2 module). —
  {
    key: 'languages',
    label: 'Languages',
    group: 'knowledge',
    placement: 'spaces-only',
    routePath: null,
    homeOwner: 'a-space',
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
  // Bucket List → a #before-i-die Space + Dreams (Purposes owns dreams); dissolved 2026-07-15.
  {
    key: 'bucket-list',
    label: 'Bucket List',
    group: 'personal-growth',
    placement: 'spaces-only',
    routePath: null,
    homeOwner: 'a-space',
    hasStandalonePages: false,
    hasMultiModeTopView: false,
  },
]

// Global cross-cutting surfaces reserved by the IA (owned as noted). Their route/UX is built by their owners (M1.1+).
export const GLOBAL_SURFACES = [
  { key: 'home', label: 'Home', routePath: '/', owner: 'journals' },
  { key: 'calendar', label: 'Calendar', routePath: '/calendar', owner: 'sessions' }, // Global Calendar (dueIn aggregator)
  { key: 'command-palette', label: 'Search', routePath: null, owner: 'preferences' }, // Cmd+K overlay; UX by UX-2
  { key: 'notifications', label: 'Notifications', routePath: '/notifications', owner: 'notifications' },
  { key: 'settings', label: 'Settings', routePath: '/settings', owner: 'preferences' },
  { key: 'graph', label: 'Graph', routePath: '/graph', owner: 'notes' }, // Neural graph
] as const
