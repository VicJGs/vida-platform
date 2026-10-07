# fe-codec-entity-facet — Slice Map (Decomposition Gate, Step 2)

> The buildable slices + the backend/frontend split, grounded in interpretation §1–§6 + the pinned envision EC-1…EC-8
> (APPROVED 2026-10-07). **Mode:** Decide (net-new shell; the split is NOT doc-fixed, so decided here per
> entity-delivery-flow.md §8) — but the SHAPE **ratifies** the shipped Collection/Dashboard siblings (S1 presentational
> shell → `@vida/ui`; adapter → `apps/web`). **No backend track** — the page-ability registry (`@vida/core`
> `schema/_registry.ts` `ENTITY_TYPES`/`isEntityType`) is FROZEN + SHIPPED; nothing is authored there [FACT:
> packages/core/src/db/schema/_registry.ts:5-158]. Approved before per-slice work. Each slice is a full Entity-Delivery-Flow
> ② iteration (contract → scaffold → implement → tsc → audit → /critique → **per-slice Visual Gate**).

## The planes (interpretation §1 boundary — `@vida/ui` is Tamagui-only)

| plane | slice | what |
|---|---|---|
| **`@vida/ui`** (presentational) | **S1** | `EntityView` — the facet FRAME: entity header + the merged⇄tabbed `mode` toggle + the Layout-facet slot + the OPTIONAL Editor-facet slot (gate = slot presence) + per-facet state + Tabs integration (tabbed) / stacked+divider (merged) |
| **`apps/web`** (canon-wiring) | **S2** | the entity↔EntityView adapter — pure `isEntityType()` page-ability gate (→ offer the editor slot?) + the merged/tabbed per-instance-memory CONVENTION + the entity→props mapping (live `useEntity` hook deferred to first consumer, R3) |

Two slices — like Dashboard. The shell holds both modes + the gate's *presentation* in one cohesive component (S1); the
gate's *logic* + memory convention are the adapter (S2).

## Slices

### S1 — `EntityView` (presentational facet frame) · plane `@vida/ui` · frontend
**Scope:** the whole presentational shell.
- an **entity header** — the Title (serif `$display`) + an optional `subtitle` slot (bio/summary/counts) + an `action`
  slot (`⋯`); `role="region"` named via `aria-label`/`aria-labelledby`→heading (`warnMissingName`/`useId`) [EC-7];
- the **merged⇄tabbed `mode`** — CONTROLLED (`mode` + `onModeChange`); the toggle is a visible `aria-pressed` control in
  the header chrome (EC-4 placement, approved) [EC-4];
- **merged composition** — Layout body + (iff offered) a divider + the Editor body, stacked on one surface [EC-1];
- **tabbed composition** — ui-1 `Tabs` `[Home = Layout · Content = Editor]`, only the active panel mounts; Tabs is correct
  because the facets are *different content* (the inverse of collection-view's toolbar-over-Tabs choice) [EC-2];
- the **registry gate = slot presence** — the Editor facet (tab in tabbed / section in merged) renders **iff** an `editor`
  node is passed; absent → no Content tab, no merged editor section, Layout stands alone (the app decides via Seam B) [EC-3];
- **per-facet state** — the Editor facet threads its own `loading`/`empty`/`error`/`success` (shell owns a calm page
  skeleton/teaching-empty/`role="status"` error; the Layout composite self-states via its sub-shells) (BR-2) [EC-5];
- **responsive** — both modes reflow 375→1440, no 375 overflow, content column max-width centered on desktop [EC-6];
- DIRECT semantic tokens; `useReducedMotion` on the Tabs panel/indicator motion; React-19 ref-as-prop (non-generic —
  holds no `<T>`); degrade-never-crash.
**Covers:** EC-1, EC-2, EC-3 (presentation), EC-4, EC-5, EC-6, EC-7 (all `structural`) + EC-8 (`feel`, mode-switch immediacy).
**Visual Gate MUSTs:** EC-1/2/3/4/5/6/7 asserted in a real browser × 3 presets × light/dark × 375/768/1440 + axe.
**Out:** the Editor facet BODY (TipTap = #7) · the Layout sub-shell BODIES (#4/#5, composed) · the gate LOGIC + memory (S2).

### S2 — entity↔EntityView adapter (convention + types + pure gate) · plane `apps/web` · shared
**Scope:** the documented shape a module uses to drive `EntityView` from the FROZEN `@vida/core` registry.
- `import { isEntityType } from '@vida/core'` (the page-ability gate) — **this plane only** (forbidden in `@vida/ui`);
- a pure `offersEditor(entityType, hasPage)` = `isEntityType(entityType) && hasPage` → decides whether to pass the `editor`
  slot (the registry gate's LOGIC; drives EC-3's presentation in S1) [FACT: _registry.ts:157 `isEntityType`];
- the merged/tabbed **memory CONVENTION** — `readMode`/`persistMode(entityType, entityId)` (storage is design-pass-open,
  O4 — the adapter defines the shape, not the schema) [FACT: frontend-quality-bar/_index.md:150; ADR-006:130];
- the `EntityAdapter` convention interface (entity row → `EntityViewProps`) + a mapping/gate unit test. **Live
  `useEntity(entityType, entityId)` hook deferred to the first consumer** (the module entity pages), exactly the
  Collection/Dashboard adapter shape (pure pieces ship, hook defers) [R3; FACT: fe-codec-dashboard slice-map S2].
**Covers:** the §2.3 NEED + M3; the gate LOGIC behind EC-3 (presentation carried by S1).
**Out:** the live hook · the merged/tabbed storage schema (O4) · per-module entity surfaces + data (O5).

## EC → slice coverage (every `structural` EC maps to ≥1 slice)

| EC | type | slice | carried as |
|----|------|-------|-----------|
| EC-1 merged: both facets, one surface, divider | structural | S1 | Visual-Gate MUST |
| EC-2 tabbed: Home/Content, active-only, indicator | structural | S1 | Visual-Gate MUST |
| EC-3 page-less: no Editor facet/tab (gate) | structural | S1 (presentation) + S2 (logic) | Visual-Gate MUST |
| EC-4 mode toggle visible + aria-pressed (header) | structural | S1 | Visual-Gate MUST |
| EC-5 per-facet independent state, calm degrade | structural | S1 | Visual-Gate MUST |
| EC-6 reflow 375→1440, no overflow, centered | structural | S1 | Visual-Gate MUST |
| EC-7 serif title · DIRECT tokens · dark designed · preset flips | structural | S1 | Visual-Gate MUST |
| EC-8 mode-switch immediacy · editor reads as a document | feel | S1 | live Visual Gate (feel) |

All `structural` ECs home to S1 (the frame is where mode/gate/state/reflow live); EC-3's gate LOGIC is S2 but its
*presentation* (no tab/section) is S1 — coverage complete, no unhomed EC.

## Out of scope (homed by the docs — interpretation §5 OVERFLOWING)
- The Editor facet BODY = the TipTap block canvas + the 11+11 block registry → **Canvas: Editor #7** (not built; not a dep) (O1).
- The Layout facet's dashboard/views BODIES → `DashboardView` #5 ✅ / `CollectionView` #4 ✅ (composed as slots) (O2).
- The page-ability registry itself → `@vida/core` `schema/_registry.ts` (frozen; READ, not authored) (O3).
- Per-instance merged/tabbed MEMORY storage → design-pass-open (O4) · per-module entity surfaces + data → module ② tracks (O5).
- The Flow/Session shell that CONSUMES #6 → fe-codec-flow-session #11 (O6).

## Build order
**S1 → S2.** S1 is the shell every entity page needs; S2 is the convention that gates the editor + maps an entity into it.
S1 carries all ECs + the Visual Gate; S2 is pure + type-level (no Visual Gate — no rendered surface, the Collection/Dashboard
adapter precedent).
