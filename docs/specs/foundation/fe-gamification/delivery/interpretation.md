<!-- Interpretation Layer — fe-gamification (LIF-181) · Entity Delivery Flow ② · Step 1 · 2026-10-12 -->
<!-- Make the implicit explicit BEFORE decomposing. Each claim [FACT: path:line] / [INTERP] / [UNKNOWN]. -->
<!-- Reads: knowledge/reference-docs/entity-delivery-flow.md §3. Ground truth = the ①↔② seam-contract + mod-gamification/current-*. -->

# Interpretation — fe-gamification ② ("the System" surface)

## §0. What this is

The **wired UI tier** over the finished `mod-gamification` ① service. The backend is COMPLETE (S1–S4,
LIF-124, PR #67) and exposes a fixed contract; this ② build renders that contract and holds **NO business
logic**. `[FACT: docs/features/gamification/delivery/seam-contract.md:77-80]` Every balance is a live
`computeBalance` read; levels/titles are a pure derivation; the UI only renders shapes and calls ops.

Mode: **Decide** (net-new frontend decomposition) — the backend slice-map only _sketched_ the ② surfaces
(one line: "currency dashboard · rule builder · achievement wall"). `[FACT: features/gamification/delivery/slice-map.md:54-56]`

## §1. DEPENDENCIES (what must already exist — all ✅)

- **The ①↔② seam** — `createGamificationService(deps): GamificationService` with the full op surface
  (currencies/balances · levels/profile · rules · achievements · journal). `[FACT: seam-contract.md:5-66]`
- **CODEC shells (@vida/ui, all shipped):**
  - `DashboardView` — grid of integration-block widgets via a `renderBlock` render-prop (LIF-208 ✅).
    `[FACT: packages/ui/src/components/dashboard-view.tsx]` → the **System dashboard**.
  - `FlowSessionView` — the multi-step guided-flow shell (LIF-210 ✅). `[FACT: flow-session-view.tsx]`
    → the **rule-authoring flow**.
  - `CollectionView` — Saved-View-in-a-view-mode shell, 7 renderers via `renderView` render-prop (LIF-207 ✅).
    `[FACT: collection-view.tsx]` → the **achievement wall** (gallery/list) + the **rules list**.
  - `EntityView` — standalone title+facet page (LIF-209 ✅); `Card` frame. → standalone currency/level detail.
- **The live-data pattern** — `useCollection(viewId, layouts)` (React Query), the hook `fe-notes` invented
  as the first consumer. `[FACT: apps/web/src/collection/use-collection.ts]` fe-gamification is the SECOND
  consumer → it **copies** this pattern (the whole reason this surface is 🟢-after-notes).
- **Pattern-kit (fe-codec-patterns ✅):** the 8-state machine (`deriveInteractionState`/`collapseToTerminal`),
  `EmptyState`, `SyncStatus`/`HonestProgress`, `ReducedMotion`, `VoiceCopy`. `[FACT: apps/web/src/state-conventions/]`
- **Theme/tokens (fe-codec-theme ✅):** every value from a semantic token; no hard-coded palette.

## §2. NEEDS (what the surface must let the user DO)

**The gamification module is a MULTI-MODE TOP VIEW** (IA §4; config `hasMultiModeTopView:true`,
`hasStandalonePages:false` — no routed detail pages, content lives in the modes).
`[FACT: information-architecture.md:84-90; ux-1 IMPLEMENTATION-PLAN:104]` Its documented content =
_currencies · levels · achievements + rule authoring_ (`view-intent-harvest.md:36`; `decomposition.md:105`).
All list modes **paginate** (cursor-based, 50/page). `[FACT: performance-strategy.md:413]`

**Modes of the `/gamification` top view** (the exact set is a per-module ADR-007 §3.6 build decision; these are
the grounded candidates = the entities the module owns):

1. **Overview** (`DashboardView`) — the glanceable hub: level + title + XP-to-next (`deriveLevel`),
   currency balances (`getBalances`: earned/locked/current), recent achievements/unlocks (from `summary`).
2. **Currencies** (`CollectionView`, paginated) — ALL user-defined currencies grouped by the 3 backing kinds,
   each with current + locked + its ledger activity; `+ New currency`.
3. **Achievements** (`CollectionView`, paginated) — ALL achievements by category × tier, earned + locked + progress.
4. **Rules** (`CollectionView`, paginated) — ALL rules + enable/disable/delete + `+ New rule` → the Flow.
5. **Activity** (`CollectionView`, paginated) — the full consequence ledger history.

**Rule-authoring Flow (`FlowSessionView`)** — opened from Rules mode: guided condition → reward → review.
Condition reads the **advertised measurement registry** (ADR-011 §3.6 advertise/query — open set, honest
empty-seam state at M1); reward spans money · allowance · time and **may earmark a Dream** (GM-7). The
open-ended authoring sandbox/DSL is OUT (#85 CAP-authoring, M4). `[FACT: seam-contract.md:72-73; contract.md]`

**Conditional dock** (shell concern, not a surface): the `/gamification` dock item is visible only when
`feature_gamification` is ON. `[FACT: ux-1 IMPLEMENTATION-PLAN:104; information-architecture.md:112]` Thin wiring leg.

**Ownership discipline (compose/read, don't rebuild):** quests/challenges = **Spaces** saved Views,
⚠ INTENDED-later (GM-17) — OUT. Dreams = **Purposes**-owned (reward target only, GM-7); storage boxes =
**Finance**-owned; streaks = **module**-owned reads (GM-11). The System renders its OWN data (currencies ·
levels · achievements · rules · ledger) + reads others via seams; it mints no shallow duplicate widgets. Icons
= lucide/SVG, never emoji (EC-15).

## §3. ORGANIZATION (where the code lives)

- `apps/web/src/gamification/` — mirrors `apps/web/src/home/` (dashboard consumer) + `collection/` (data hook).
  `[FACT: apps/web/src/home/ shape]`
- Lazy route(s) under the shell: `/gamification` (the System hub) + any standalone detail. Mirrors `/notes`,
  `/home` lazy-route wiring. `[INTERP]`
- The UI composes @vida/ui shells + `@vida/core` service ops via a thin per-surface hook (the `useCollection`/
  `buildDashboard` precedent); NO new @vida/ui component unless a genuine reusable gap appears (rule-of-three).

## §4. IMPLICIT RULES (the traps — caught here, not in the browser)

- **IR-G1 · Live data-plane is likely a STUB this unit, swapped later.** `fe-notes` deferred its live data
  hook: "live blocked by worker-RPC Drizzle `values` seam + no composition root; drop-in swap deferred."
  `[FACT: TASKS.md fe-notes-and-pages S1 D2]` fe-gamification inherits the same gap → the hooks are
  **type+shape-correct against the seam**, data STUBBED, live swap = one binding change at the first
  composition root. State this per-slice; do not fake a live DB. `[INTERP]`
- **IR-G2 · Terminal states are ②'s, from the canon-by-TYPE.** loading/empty/error/success via the
  `@vida/core` `TerminalState` canon — reuse by type, never re-derive a 5th state.
  `[FACT: seam-contract.md:78-80]` All 8 visual states ship per slice (§VIII) — no "happy path first".
- **IR-G3 · No business logic in the UI.** No stored balances, no client-side level math beyond calling
  `deriveLevel`, no `move_money`/`surface_notification` calls (those fire as effects, not seam ops).
  `[FACT: seam-contract.md:72-75]`
- **IR-G4 · Store/net-worth is Finance-owned.** The "spend/store worth-tree" is NOT built here (FIN-18/24);
  the System hub shows balances + `previewSpend`, never a store. `[FACT: seam-contract.md:72; current-spec.md:64]`
- **IR-G5 · Honest progress only.** XP-to-next-level and any bars use `HonestProgress`/`SyncStatus` (no
  fabricated "saving"/cloud states — M1 is local). `[FACT: fe-codec-patterns S4]`

## §5. ENVISION GATE — trigger test (§3.75)

> "Is there a user affordance whose UI answer isn't already obvious from an existing shipped surface?"

**YES → the gate FIRES.** Two affordances have no obvious shipped answer:

- **The "System" hub composition** — how do level + title + XP-progress + N currency balances + recent
  unlocks compose into one _glanceable, motivating_ surface (not a dashboard of raw numbers)? The
  `DashboardView` gives the grid; the _widget vocabulary and hierarchy_ is a design decision.
- **The rule-authoring flow** — how a user authors a condition→consequence rule through `FlowSessionView`
  is a novel multi-step interaction with no shipped precedent.

The achievement wall is a dashboard section (thin); the rule-authoring Flow is the novel interaction. Both
are greyboxed within the two surfaces. → **Step 1.5 Envision Gate is REQUIRED** (greybox + Victor's blocking
checkpoint approval) before decomposition.

## §6. OPEN QUESTIONS — both doc-RESOLVED (grounding catch, 2026-10-12)

- ~~OQ-G1 · Is rule-authoring in scope?~~ **RESOLVED: YES.** "(conditional)" = conditional _dock_ (feature
  flag), not conditional scope. The ② decomposition names rule-authoring as one of the two surfaces.
  `[FACT: frontend-replan/decomposition.md:105; information-architecture.md:112]` The open-ended DSL stays
  OUT (#85); a basic guided flow is in.
- ~~OQ-G2 · Which surfaces for v1?~~ **RESOLVED: two** — System Dashboard (overview, achievements fold in) +
  rule-authoring Flow. `[FACT: decomposition.md:105]` Not three; the "wall" is a dashboard section.
- Remaining genuine input (Envision gate, Victor's call — vision not scope): the _widget vocabulary &
  hierarchy_ of the System hub and the _step shape_ of the rule-authoring flow. These are what the greybox
  pins as checkpoints EC-n.

## §7. ADAPTIVE REGISTER — intent, verified dependency, and the forced v1 scope

**Documented intent (confirmed, not invented).** "the System" is a **gamification of real life with real
stakes** aimed at two audiences — _"many kids, and people trying to turn their life around"_
`[FACT: identity.md:11,6]`. The intent is a **dual, user-adaptive register**: a game-like path (students/
teens) and a calmer register (adults turning their life around) — NOT a single visual pick. The adaptive key
is schema-backed: `persona` (`['student','professional','entrepreneur','creative','parent','retiree']`),
`motivation_style`, `life_stage`. `[FACT: packages/types/src/entities/user.ts:13-20,44-48]`

**Verified "not-yet-built" dependencies (2026-10-12, grounded per Victor):**

- **D-REG-1 · No game-like theme preset exists.** `ThemePreset = 'reader' | 'editorial' | 'quietDesk'` —
  three calm/editorial presets; the only other axis is `density` (calm/dense = spacing+type, not a register).
  `[FACT: packages/ui/src/theme-resolution.ts:6,9,30]` → the game-like register has **no token home**. A
  vivid/game preset is owned by **fe-codec-theme** (LIF-213 shipped the 3; a 4th = a new preset unit +
  Figma, release-gated M4/P2 per frontend-source-of-truth). **UNTRACKED — no Linear issue exists yet.**
- **D-REG-2 · `motivation_style` has no live value at runtime.** Preferences reads it
  (`preferences/service.ts:149`) but it defaults `null` (`:91`) and the user-facing **setter is
  `fe-settings` (LIF-193), Backlog/not built**. `motivation_style`/`persona` are **Preferences-owned**
  (single-writer, ADR-012 §3.10 / PR-10) `[FACT: preferences/current-business-rules.md; features/preferences/business-rules.md:18]`
  → the gamification ② can only READ the key via a deny-safe Preferences port; it is `null` until fe-settings.

**v1 scope — DOC-RESOLVED 2026-10-12 (GM-16, not a decision).** Two separable things:

- **G0 · Game theme = a GLOBAL preset (`@vida/ui` design-system extension), built in this unit (Victor).**
  A 4th sibling to reader/editorial/quietDesk in the SAME token architecture (primitive ramps `gameNeutral*`/
  `gameAccent*` → `semantic.game(.dark).json` overlay → game fonts; light+dark, AA-verified, token-pure).
  It regenerates `themes.ts` + extends `ThemePreset`/`THEME_PRESETS`/`ThemeName`/`resolveTheme`.
- **Application is GLOBAL and NOT this unit's.** GM-16 / identity.md:41: \*persona weighting + theme/onboarding
  guidance belong to **Preferences/Onboarding + Spaces\***; the System is explicitly **not the persona/framing
  owner**. The `game` preset is selected via the existing theme picker (fe-onboarding S3/S4, fe-settings);
  **persona → suggest-`game`-at-onboarding is Onboarding's job**, a documented hand-off, NOT fe-gamification.
- **A System-scoped sub-theme / `RegisterMode` seam is RULED OUT by GM-16** (that would make the System own
  framing). My earlier "persona-driven scoped register" was a mis-read of "reads persona for framing".
- **What the System DOES read persona for = REWARD FRAMING (content, GM-16 business-rules.md:90)** — which
  rewards/currencies it emphasizes + the manhwa-"System" tone in COPY, NOT theming. A deny-safe Preferences
  `persona` read (absent/`null` ⇒ neutral framing); purely content-level.

**Dependency flag (resolved, mirrored in `.claude/tasks/fe-gamification.md`):**

- ~~D-REG-1 game preset~~ → **RESOLVED: built in-unit as a GLOBAL preset (G0).** No Linear issue needed.
- ~~D-REG-2 scoped register seam / motivation_style~~ → **DISSOLVED.** No scoped register (GM-16). Theme
  selection is Preferences/Onboarding-owned (global picker, already shipped); persona→game suggestion =
  Onboarding follow-up. The System only reads `persona` deny-safe for REWARD-CONTENT framing.
