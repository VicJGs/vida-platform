# IMPLEMENTATION-PLAN — UX-1 Information Architecture (session: 2026-08-01-ux-1-information-architecture · language: English)

> Human gate 2: read to catch a wrong/missing/destructive step BEFORE code. Self-sufficient build prompt; each
> step cites the PLAN rule it satisfies. Derived from the APPROVED PLAN Rev 3 (§6 Approval 1, 2026-08-01).

## 1. Full context

- **Deliverable (2 artifacts, dual home):** (1) an IA **design doc**; (2) a declarative **nav/module-map** code
  artifact. `[FACT: PLAN §2; reconstructed-structure.md:72]`
- **Nav model = co-primary dual-axis** (module dock = content home + Spaces bar = cross-cutting overlays);
  **amends ADR-007:88**, ADR-006 §3.4 as cover. `[FACT: PLAN §3 BR-1; Victor 2026-08-01]`
- **Homes (VERIFIED, PLAN §5):** doc → `docs/core/architecture/information-architecture.md`; code →
  **`apps/web/src/nav/`** (new dir + ADR-018 §3.6 `CLAUDE.md`). `[FACT: reconstructed-structure.md:72; platform-strategy.md §5]`
- **Ground-truth floors:** the module inventory `[FACT: system-overview.md §2]`; the per-module surface intent
  `[FACT: view-intent-harvest.md §A–C — second-hand summary of docs/features/<module>/{identity,contract,structure-data}.md,
cited there with file:line]`; the AR-4 router decision — single central `routes.tsx`, **no self-registration
  seam** `[FACT: web-client-runtime/current-spec.md:88-89]`; routing conventions `[INTENT: BR-RT-8/9]`.
- **Build-note (from re-critique C):** per-module entries below trace to the harvest; at build, spot-verify each
  module's **placement class** (dock/global/non-nav/spaces-only) against its primary `docs/features/<module>/identity.md`
  before committing the map (a summary can drift). Placement — not view-mode enumeration — is the contract.

## 2. Scope of changes

**Files touched (all NEW — no edits to existing code):**

1. `docs/core/architecture/information-architecture.md` (new doc)
2. `apps/web/src/nav/module-map.ts` (new code)
3. `apps/web/src/nav/CLAUDE.md` (new layer doc — ADR-018 §3.6)
4. `docs/core/architecture/README.md` (add one index row for the new doc)

**NOT done (table):**
| Not done | Why / owner |
|----------|-------------|
| Modify `apps/web/src/routes.tsx` | Home=Journal is UX-6; per-module routes M1.1+; AR-4 owns the tree `[routes.tsx:9]` |
| Build any chrome/layout/component (dock, Spaces bar, sidebar…) | UX-3 (layout) / UI-4 (components) `[delivery-plan:186]` |
| Build the Spaces UI / `nav_preferences` table | Spaces/Preferences, M1.1 `[roadmap.md:94; ADR-017]` |
| Enumerate specific view modes (12 Tasks layouts…) as contract | per-module VIEWS review, M1.1+ `[ADR-007:94]` |
| Register per-module routes | each module's M1.1+ wave `[routes.tsx:9]` |
| Put the map in `packages/*` | per-app routing is platform-specific `[platform-strategy.md §5]`; M4 revisit |

## 3. Exact changes

### 3.1 — `apps/web/src/nav/module-map.ts` (NEW)

**operation:** add. **Satisfies:** PLAN §2 IN.2 + §3 BR-1/2/3/4. **Content:**

```ts
// Canonical nav/module map — UX-1 (LIF-90). Central DATA, read by the nav chrome (UI-4) + M1.1+ route wiring.
// NOT a self-registration seam (AR-4 resolved: single central routes.tsx, no seam — web-client-runtime:88-89).
// Does not touch routes.tsx. Dual-axis nav: module dock (content home) + Spaces bar (cross-cutting overlays).

export type ModuleGroup =
  | 'integration'
  | 'productivity'
  | 'knowledge'
  | 'personal-growth'
  | 'life-management'
  | 'platform-services'

// dock = top-level content home · global = cross-cutting surface (owned) · secondary = reachable standalone page
// but surfaced within another realm's flow (not a dock item) · non-nav = lives entirely inside another realm ·
// spaces-only = reached via the Spaces axis (not a module)
export type NavPlacement = 'dock' | 'global' | 'secondary' | 'non-nav' | 'spaces-only'

export interface ModuleNavEntry {
  key: string // canonical module key (matches system-overview §2 / services/<key>)
  label: string // display label
  group: ModuleGroup // system-overview §2 grouping (dock ordering)
  placement: NavPlacement
  visibleWhen?: string // conditional-dock: the feature flag that must be ON to show it (e.g. 'feature_gamification')
  routePath: string | null // top-level route for dock/global/secondary; null for non-nav/spaces-only.
  // NB: UX-facing — MAY differ from key (relationships→/people, preferences→/settings). Do NOT assume '/'+key.
  homeOwner: string | null // for non-nav/spaces-only: the realm it lives in (e.g. 'sessions','preferences','home','a-space')
  hasStandalonePages: boolean // module exposes per-entity standalone pages
  hasMultiModeTopView: boolean // top view has user-selectable modes (modes NOT enumerated here — per-module VIEWS review)
}

// The two co-primary axes (structural; Spaces bar is a DESIGNED SEAM — live in M1.1).
export const NAV_AXES = {
  moduleDock: { role: 'content-home', primary: true },
  spacesBar: { role: 'cross-cutting-overlays', primary: true, seam: true, livesFrom: 'M1.1' },
} as const

// NOTE — system-overview §2 also lists 8 FOUNDATION SUBSTRATES (Spaces&Tags, Sessions, Measurability, Points
// Economy, Saved Views, Review Engine, Capability Registry, Ingestion&AI). These are cross-cutting primitives,
// NOT dock modules: Spaces = the second nav axis (NAV_AXES.spacesBar); Sessions = a dock surface (agenda) + owns
// /calendar; Points Economy surfaces as Gamification (conditional dock). Measurability, Saved Views, Review Engine,
// Capability Registry, Ingestion&AI have NO nav presence — they power modules, not navigation.
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
  {
    key: 'habits',
    label: 'Habits',
    group: 'productivity',
    placement: 'dock',
    routePath: '/habits',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
  {
    key: 'projects',
    label: 'Projects',
    group: 'productivity',
    placement: 'dock',
    routePath: '/projects',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
  {
    key: 'routines',
    label: 'Routines',
    group: 'productivity',
    placement: 'dock',
    routePath: '/routines',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: false,
  }, // orchestration COCKPIT — active counterpart to the Calendar; launches Sessions but is not inside them (routines/identity.md:5-8,45)
  {
    key: 'pomodoro',
    label: 'Focus',
    group: 'productivity',
    placement: 'non-nav',
    routePath: null,
    homeOwner: 'sessions',
    hasStandalonePages: false,
    hasMultiModeTopView: false,
  }, // NOT a module — Focus Mode inside Sessions realm (pomodoro/identity.md:6,41)
  // — Knowledge —
  {
    key: 'learning',
    label: 'Learning',
    group: 'knowledge',
    placement: 'dock',
    routePath: '/learning',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
  {
    key: 'books',
    label: 'Books',
    group: 'knowledge',
    placement: 'dock',
    routePath: '/books',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
  {
    key: 'knowledge',
    label: 'Knowledge',
    group: 'knowledge',
    placement: 'dock',
    routePath: '/knowledge',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
  {
    key: 'skills',
    label: 'Skills',
    group: 'knowledge',
    placement: 'dock',
    routePath: '/skills',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
  {
    key: 'sessions',
    label: 'Sessions',
    group: 'knowledge',
    placement: 'dock',
    routePath: '/sessions',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
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
  // — Personal Growth —
  {
    key: 'purposes',
    label: 'Purposes',
    group: 'personal-growth',
    placement: 'dock',
    routePath: '/purposes',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
  {
    key: 'checkins',
    label: 'Check-ins',
    group: 'personal-growth',
    placement: 'secondary',
    routePath: '/checkins',
    homeOwner: 'home',
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  }, // secondary: surfaced in Journal flow + a reachable standalone page (check-ins/identity.md:25)
  {
    key: 'health',
    label: 'Health',
    group: 'personal-growth',
    placement: 'dock',
    routePath: '/health',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
  // — Life Management —
  {
    key: 'finance',
    label: 'Finance',
    group: 'life-management',
    placement: 'dock',
    routePath: '/finance',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
  {
    key: 'relationships',
    label: 'Relationships',
    group: 'life-management',
    placement: 'dock',
    routePath: '/people',
    homeOwner: null,
    hasStandalonePages: true,
    hasMultiModeTopView: true,
  },
  // — Platform Services (mostly global/non-nav) —
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
  }, // CONDITIONAL dock — opt-in; System dashboard shows only when the flag is on (gamification/identity.md:8,43)
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
  // — Spaces-only (DISSOLVED into the Spaces axis, not modules — system-overview §2 lists them, but they resolve
  //   to Spaces per features/README + intake). Duties also dissolved → Tasks TYPES (no row; not a §2 module). —
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
  {
    key: 'bucket-list',
    label: 'Bucket List',
    group: 'personal-growth',
    placement: 'spaces-only',
    routePath: null,
    homeOwner: 'a-space',
    hasStandalonePages: false,
    hasMultiModeTopView: false,
  }, // → #before-i-die Space + Dreams (Purposes owns dreams); dissolved 2026-07-15
]

// Global cross-cutting surfaces reserved by the IA (owned as noted). Route/UX built by their owners (M1.1+).
export const GLOBAL_SURFACES = [
  { key: 'home', label: 'Home', routePath: '/', owner: 'journals' },
  { key: 'calendar', label: 'Calendar', routePath: '/calendar', owner: 'sessions' }, // Global Calendar (dueIn aggregator)
  { key: 'command-palette', label: 'Search', routePath: null, owner: 'preferences' }, // ⌘K overlay; UX by UX-2
  { key: 'notifications', label: 'Notifications', routePath: '/notifications', owner: 'notifications' },
  { key: 'settings', label: 'Settings', routePath: '/settings', owner: 'preferences' },
  { key: 'graph', label: 'Graph', routePath: '/graph', owner: 'notes' }, // Neural graph
] as const
```

**Step verification:** `pnpm --filter @vida/web typecheck` passes; `grep -n "routes.tsx" apps/web/src/nav/module-map.ts` → no import of / mutation to routes.tsx; every `system-overview.md §2` module key appears exactly once.

### 3.2 — `apps/web/src/nav/CLAUDE.md` (NEW — ADR-018 §3.6 layer doc)

**operation:** add. **Satisfies:** ADR-018 §3.6 (a home carries a layer-doc, not stubs). Content: what lives here
(the canonical nav/module map = central data), the owning issue (UX-1/LIF-90), the dual-axis model + the rule that
this is data-not-chrome and does not self-register routes.

### 3.3 — `docs/core/architecture/information-architecture.md` (NEW design doc)

**operation:** add. **Satisfies:** PLAN §2 IN.1 (a–f). **Section structure:**

1. **Purpose & scope** — what an IA is here; what it is NOT (chrome/layout/components — owners named). `[PLAN §1]`
2. **The co-primary dual-axis nav model** — module dock (content home) + Spaces bar (overlays); ownership rule;
   **the ADR-007:88 amendment stated plainly** (+ ADR-006 §3.4 cover; owed to Spaces ADR). `[PLAN §3 BR-1]`
3. **The module dock** — the canonical inventory grouped (Integration·Productivity·Knowledge·Personal-Growth·
   Life-Management·Platform-Services); a table (module · group · route · placement). Every module placed. `[system-overview §2; §3.1 map]`
4. **Per-module surface class** — names that each dock module HAS {top view (multi-mode where documented) ·
   standalone entity pages · aggregate/index surfaces}; reserves the shape; explicitly defers specific modes to
   the per-module VIEWS review. `[PLAN §2 IN.1c; view-intent-harvest §B]`
5. **Global cross-cutting surfaces** — Home=Journal · Global Calendar · ⌘K · Notifications · Settings · Neural
   Graph; each with a reserved place + owner. `[view-intent-harvest §A; §3.1 GLOBAL_SURFACES]`
6. **Non-top-level placements** — **Pomodoro** → Sessions Focus Mode + **Flashcards** → Knowledge (both doc-stated
   "not a module": pomodoro/identity.md:6,41; flashcards/identity.md:3,38); **Check-ins** → secondary (Journal flow
   - a standalone page: check-ins/identity.md:25). **+ dissolved set** (Languages, Bucket List → Spaces; **Dreams**
     under Purposes; Duties → Tasks types) + the 8 **substrates** note (cross-cutting, no dock presence).
     **⚠ CORRECTED after primary-doc dereference (Victor, 2026-08-02):** **Routines is a DOCK cockpit** (active
     counterpart to the Calendar — routines/identity.md:5-8; the harvest misread it as inside-Sessions), and
     **Gamification is a CONDITIONAL dock** item (opt-in `feature_gamification` — gamification/identity.md:8,43),
     not tucked in Settings.
7. **The Spaces axis (seam)** — how the Spaces bar composes tags + saved views over the dock; designed now, live
   M1.1; consumes `nav_preferences` per-Space visibility. `[ADR-006/007; roadmap.md:94]`
8. **Route hierarchy** — top-level routes (from the map), the per-module route PATTERN for M1.1+
   (`lazy(() => import('./app/<module>'))`), Home `/` = Journal; consistent with BR-RT-8/9; does not register them. `[web-client-runtime:88-89]`
9. **Consumption** — how UX-2/3/4/5, UI-4, and M1.1+ modules read this doc + the map.

**Step verification:** every `MODULE_MAP` key is placed in §3/§5/§6; §2 contains the explicit "amends ADR-007:88"
sentence; a grep for "12 layouts"/specific-mode enumerations returns nothing in the doc (kept to harvest).

### 3.4 — `docs/core/architecture/README.md` (EDIT — one row)

**locate:** the arch-docs list/table. **operation:** insert a row linking `information-architecture.md`. **verify:** link resolves.

## 4. Business rules (technical) — PROMOTE → web-client-runtime/current-business-rules.md

- **[FACT: PLAN §3 BR-1]** Nav is co-primary dual-axis; module dock owns content homes; Spaces bar overlays
  (seam, M1.1). Amends ADR-007:88 (recorded in the IA doc).
- **[FACT: §3.1]** The canonical nav/module map is **central data** in `apps/web/src/nav/module-map.ts`; the nav
  chrome + M1.1+ route wiring READ it; it never self-registers routes or mutates `routes.tsx`.
- **[FACT: §3.1]** Each module carries a `placement ∈ {dock, global, non-nav, spaces-only}`; non-nav/spaces-only
  carry a `homeOwner`. Modes are not enumerated (per-module VIEWS review owns them).
- **[INTENT: BR-RT-8/9]** M1.1+ per-module routes follow `lazy(() => import('./app/<module>'))`, Zod params, < 80 KB budget.

## 5. Contract / structure — PROMOTE → web-client-runtime/current-spec.md

- New home **`apps/web/src/nav/`** (layer-doc'd) exporting `ModuleGroup`, `NavPlacement`, `ModuleNavEntry`,
  `NAV_AXES`, `MODULE_MAP`, `GLOBAL_SURFACES`. Types only + const data; zero runtime deps; no JSX.
- The IA design doc `docs/core/architecture/information-architecture.md` joins the 8 arch docs as the IA authority.

## 6. Acceptance & verification

- [ ] `pnpm --filter @vida/web typecheck` green; map is typed const data, no JSX, no `routes.tsx` import. _(correctness)_
- [ ] `git diff --stat` touches only the 4 files in §2; `routes.tsx` unchanged. _(non-regression / boundary)_
- [ ] Every USER-FACING module in `system-overview.md §2` is placed once in `MODULE_MAP` **or** carries a documented-dissolution row (Bucket List, Languages → `spaces-only`; Duties → Tasks types, noted); the 8 §2 **substrates** are covered by the "not dock modules" note; non-top-level modules carry `placement≠dock` + a `homeOwner`. _(completeness)_
- [ ] IA doc §2 contains the explicit "amends ADR-007:88" statement + ADR-006 §3.4 cover. _(honesty)_
- [ ] IA doc enumerates NO specific view modes as deliverables (grep clean); surface class only. _(scope boundary)_
- [ ] `apps/web/src/nav/CLAUDE.md` exists (ADR-018 §3.6). _(convention)_
- [ ] `docs/core/architecture/README.md` links the new doc. _(discoverability)_
- [ ] Placement class of each non-nav/spaces-only/global entry spot-checked vs its primary `docs/features/<module>/identity.md`. _(de-reference, re-critique C)_

## 7. Gates cleared

- /critique (PLAN Rev-3): REVISE (3 findings fixed) · 2026-08-01
- /critique (IMPLEMENTATION-PLAN §3.1 map): REVISE → 4 findings fixed (Bucket-List row, checkins→non-nav, substrates note, key≠route comment) · 2026-08-01
- /preflight (PLAN): PASSED (AR-4 seam gap resolved) · 2026-08-01
- /preflight (IMPLEMENTATION-PLAN): PASSED — 4 files fully specified w/ per-step verify; homes verified; one documented assumption (route slugs are the proposed hierarchy, M1.1-adjustable) · 2026-08-01
- Approval 1 (direction): ✅ Victor · 2026-08-01
- Approval 2 (cleared to implement): ✅ Victor · 2026-08-02 — structure reviewed; Routines→dock, Check-ins→secondary, Gamification→conditional dock, Sessions kept as its own dock item (not folded behind Calendar)

## 8. Rollback / risk

- **Rollback:** all 4 files are NEW (+ one additive README row) → `git checkout` / delete; zero blast radius on built code.
- **Riskiest step:** §3.1 placement classification (dock vs non-nav vs spaces-only) — the one judgment surface.
  Checkpoint: the §6 spot-check vs each module's primary `identity.md` + Approval 2 review of the map before code.
