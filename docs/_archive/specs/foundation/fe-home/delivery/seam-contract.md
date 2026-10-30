# Seam Contract — fe-home (LIF-187)

> Entity Delivery Flow ② · Step 2. The seams fe-home READS / EXPOSES, so per-slice work is scoped and the deferred
> (downstream-homed) surfaces have a zero-signature-change swap. All seams follow the ProviderRead convention
> (no direct cross-module tables; `decomposition.md:1.3`).

## A. Arrangement preference seam (READ) — S3

```ts
type HomeArrangement = 'journalFirst' | 'dashboardFirst'
// fe-home READS the persisted arrangement; default 'journalFirst'. ProviderRead — no direct table.
function useHomeArrangement(): HomeArrangement // M1: returns the default; live read = Preferences seam
```

- WRITE (the toggle control) is **Settings' / Preferences'** (`fe-settings`, `decomposition.md:71`), NOT fe-home.
- Grounded: `home-journal-dashboard.md:50-54` (`get/setSelection` deferred to Preferences/MOD-journals).

## B. Widget-selection + data seam (READ) — S1

```ts
interface HomeWidget {
  id: string
  title: string
  size: CellSize
  state: ViewState
  link?: ReactNode
}
// M1: a DEFAULT widget set (summary·finance·tasks·habits·projects·purposes·dreams·schedule), all state 'success'|seam.
// Live: the personalized set (user selection) + per-widget state derived from buildDashboard / per-module providers.
function useHomeWidgets(): HomeWidget[] // M1: default set; live = journal-contribution registry (deferred)
```

- Live data (`buildDashboard(registry, date, selection?)` / per-module `summary(date)`·`dueIn(range)`) deferred to the
  first consumer (ProviderRead precedent — collection/dashboard/seams). No `@vida/core` import at M1.

## C. Standalone widget-render seam (EXPOSE) — S1

```ts
// fe-home renders each dashboard cell's SUCCESS body through this seam; DashboardView owns loading/empty/error.
function renderHomeWidget(widget: HomeWidget): ReactNode
// M1: a placeholder/seam body per widget (the real standalone capability renderer ships downstream — dashboard-view.md:8).
```

## D. Journal-page mount seam (EXPOSE) — S2

```ts
// The inline-block editor page. M1 = a faithful page region (prose + inline-block affordance + "/" hint).
// Real mount = @vida/editor <VidaEditor> with inline integration-block node-views — N6 seam, homed downstream.
interface JournalPageRegionProps {
  editorState?: ViewState
} // shell owns the page terminal states
```

- `@vida/editor` is NOT added as an apps/web dep here (the live mount is downstream / first consumer).

## E. Route seam (EXPOSE) — S3

- `routes.tsx` index route `/` → `Home` (replaces the `<h2>Vida</h2>` placeholder). Home renders inside the UI-4 shell
  `<Outlet/>` (`home-journal-dashboard.md:9`; AppShell wraps the Outlet in `RootComponent`).

## F. Composition boundary (FACT)

- fe-home lives in `apps/web/src/home/` and composes `@vida/ui` (`DashboardView`, `Card`, `EmptyState`, `EntityView`?)
  - `@tamagui/core`. It imports NO `@vida/core` / `@vida/editor` at M1 (all cross-layer reads are seams).
- EntityView (RP4): used for facet-frame semantics where it fits (Dashboard-first = `merged` layout→editor); Journal-first
  = fe-home's bespoke 2-col. Finalized at S3 `/contract`.

## Deferred (downstream-homed) — zero-signature-change swap

| Seam                | M1                      | Live owner                                       |
| ------------------- | ----------------------- | ------------------------------------------------ |
| A arrangement READ  | default `journalFirst`  | Preferences / fe-settings                        |
| B widget set + data | default set, seam state | journal-contribution registry / first consumer   |
| C widget bodies     | placeholder             | each capability's standalone renderer            |
| D journal page      | placeholder region      | `@vida/editor` VidaEditor mount / first consumer |
