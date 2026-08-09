# Baseline — ux-2-command-bar-search (§XXVI.1a ground truth)

> No-Guessing: every line is `[FACT: source]` / `[INTERP: from fact]` / `[UNKNOWN: needs X]`.
> This is the ground truth the PLAN + both gates are measured against. Gathered 2026-08-09 from the live tree.

## 0. What UX-2 is, per the authoritative IA (UX-1)
- `[FACT: docs/core/architecture/information-architecture.md:104]` The command bar is registered in the IA
  surface table as **"Search (⌘K) | overlay | Preferences *(UX by UX-2)*"** — a **global overlay** surface,
  realm-owned by **Preferences**, keybind **`⌘K`**, its UX explicitly delegated to UX-2.
- `[FACT: ia.md:154]` "UX-2 builds the command-bar + search UX for the `⌘K` global surface."
- `[FACT: ia.md:16-18]` UX-1 explicitly scopes OUT "the command-bar + search UX (UX-2)" and "the shell
  components — dock/sidebar/top-bar/command-bar/modal host (UI-4)".
- `[INTERP]` So UX-2 owns the **interaction model** of a `⌘K` global overlay launcher + search; the physical
  **rendering** is UI-4's; the **backing data** is Preferences' (`command_bar_history`) + search's (FTS5/DB-8).

## 1. What EXISTS today (the substrate UX-2 sits on)
- `[FACT: apps/web/src tree]` The web shell is thin: `App.tsx`, `main.tsx`, `routes.tsx`, `nav/module-map.ts`
  (UX-1), `stores/app-shell-ui-store.ts` (AR-4), `db/*`, `hooks/*`, `lib/*`. **`components/` is EMPTY** (`.gitkeep`).
- `[FACT: apps/web/src/nav/module-map.ts:1-30]` UX-1's `module-map.ts` is the single source of truth for WHAT
  modules exist, WHERE they sit, HOW they're reached — "central DATA, read by the nav chrome (UI-4)". It defines
  a `global` surface type: "always-present cross-cutting surface, owned by a module, reached from anywhere" —
  `[INTERP]` the exact category the command bar belongs to; UX-2's launcher targets/reads this map.
- `[FACT: apps/web/src/stores/app-shell-ui-store.ts]` The reference Zustand store (AR-4). Holds **ONLY ephemeral
  UI state** (BR-RT-6): sidebar open, view mode, selections — "NEVER entity data or persisted preferences".
  `[INTERP]` command-bar open/close + query-in-flight state follows this pattern (a `command-bar-ui-store.ts`
  or an extension), NOT React Query, NOT persisted.
- `[FACT: routes.tsx via ia.md:139-140]` Routing is one central type-safe `routes.tsx`, Zod-validated params,
  lazy-split, <80 KB budget. `[INTERP]` the launcher NAVIGATES via this router; it registers no routes itself.
- `[FACT: apps/web/package.json]` Deps: `@tanstack/{react-form,react-query,react-router}`, `@vida/core`,
  `@vida/types`, `drizzle-orm`, `react`, `wa-sqlite`, `zod`, `zustand`. **No command-palette lib** (cmdk/kbar).
  **`@vida/ui` is NOT yet a dep** of apps/web — the UI-1 primitives (v0.1.0) aren't wired into the web app.
- `[FACT: grep]` **No existing command-bar / search / palette UI code** anywhere in `apps/web/src` or
  `packages/ui/src` — UX-2 is greenfield.

## 2. What does NOT exist yet — the three seams UX-2 must design AGAINST but NOT build
1. **`command_bar_history` (the launcher's backing store)** — `[FACT: grep]` present ONLY in
   `packages/core/src/db/_legacy/schema.v1.ts:1291` (v1) + stale `packages/core/dist/*` (compiled). **NOT in the
   v2 source schema.** `[FACT: CLAUDE.md Data Domains]` it lives in the **Preferences** domain →
   **MOD-prefs (#32, M1.1)**, which is **not built**. `[INTERP]` the recency/history backing store does not
   exist in v2 yet → UX-2 designs the seam, must not code against a non-existent table.
2. **FTS5 full-text search** — `[FACT: core/src/services/search/CLAUDE.md]` `services/search` exists (AR-8) but
   contains **only** the backlink-resolver; "FTS5 full-text search — **pending**, streams in at **DB-8 (#60)**"
   (M1.4). `[INTERP]` search-as-you-type has no substrate yet → UX-2 defines the search-result contract + ranking
   UX and the seam to the future search service; it must not assume an FTS5 API.
3. **The rendering shell (UI-4)** — `[FACT: ia.md:16-17, 154]` the command-bar host is a UI-4 shell component,
   not built. `[INTERP]` UX-2 defines the interaction model UI-4 will render.

## 3. Class determination (sets the §XXVI gate variant)
- `[FACT: sibling UX-1 _index.md]` UX-1 was classed a **"design/spec issue that emits a declarative code
  artifact"** (`information-architecture.md` doc + `nav/module-map.ts` data) → **FULL** double-gate.
- `[INTERP]` UX-2 is the **same class**: a design/interaction-model spec over three unbuilt seams. Its likely
  code artifact is a **declarative command/action registry + interaction contract** in `apps/web/src` (the
  UX-1 `module-map.ts` precedent — data the UI-4 host will read), NOT a rendered React component.
  → **Recommend FULL §XXVI gate.** `[UNKNOWN: confirm at PLAN]` whether UX-2 emits a code artifact this
  session or is a pure `docs/core/architecture/` doc (like the IA doc) — the PLAN decides; both are FULL-class.

## 4. UNKNOWNs resolved by this baseline
- ✅ `command_bar_history` — resolved: exists in v1/dist only, **not v2**; Preferences/M1.1 unbuilt → seam, not dependency.
- ✅ FTS5 seam — resolved: **DB-8 #60, M1.4, unbuilt** → design the result contract + seam, don't build against it.
- ✅ Keybind + surface class — resolved: `⌘K`, **global overlay, Preferences-owned** `[FACT: ia.md:104,154]`.
- ⏳ `[UNKNOWN: PLAN]` FULL-with-artifact vs pure-doc — decided at the PLAN step.
- ⏳ `[UNKNOWN: PLAN]` scope line: does UX-2 define search *ranking/preview* UX (needing an eventual FTS5 shape),
  or only the *launcher command* model + a search-seam stub? (Guard the DB-8 gap.)

## 5. Contexts touched (Currency Rule §XXIX targets at close)
- `apps/web/src` shell (nav model consumer) · possibly a new `apps/web/src` command-registry artifact.
- `docs/core/architecture/` (IA doc — UX-2 promotes its interaction model here on completion, as UX-1 did).
- No module/service code is written (the seams are unbuilt by design).
