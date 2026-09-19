<!-- Seam Contract — features/journals · Entity Delivery Flow Step 2 (Decomposition Gate)
     mod-journals #39 (LIF-127) · the service API the ② fe-journals UI + registering modules consume.
     Signatures are the DOCUMENTED TARGET (journal-service.ts = 0 lines). Every claim traces to the aspect corpus. -->

# Seam Contract — Journals service (①)

The API surface `@vida/core` exposes. Two audiences: **(A) registering modules** (call `registerJournalContribution`),
and **(B) the ② fe-journals UI** (calls the engine). Both the types and the service factory live in
`@vida/core/services/journals` (the types can't sit in `@vida/types` — they reference the `@vida/core` `TerminalState`
canon; see the Types note below). `JournalSummaryConfig` (a `Page` field) stays in `@vida/types/note.ts`.

## Types (`@vida/core/services/journals/types.ts`, net-new — supersede `apps/web/src/home/journal-contribution.ts`)
> **Home = `@vida/core`, NOT `@vida/types`** — `SectionData.state` references the `TerminalState` canon in
> `@vida/core/foundation/capability/types.ts`, and `@vida/types` (base layer) cannot import `@vida/core`
> `[FACT: foundation/capability/types.ts:14; packages/core/package.json deps @vida/types]`. apps/web re-imports these.
```ts
type HomeSectionKey = 'summary' | 'agenda' | 'entry'                 // moved from apps/web/src/home/section-model.ts
// TerminalState is REUSED from @vida/core (never redefined): ['loading','empty','error','success'].
// The journals docs' "populated" prose maps to the canon's `success`. [FACT: foundation/capability/types.ts:14]
import type { TerminalState } from '../../foundation/capability/types'

interface DataPoint { readonly id: string; readonly label: string }
interface DateRange { readonly from: string; readonly to: string }  // YYYY-MM-DD

interface SectionData {
  readonly sectionKey: HomeSectionKey
  readonly module: string
  readonly dataPoints: readonly DataPoint[]
  readonly state: TerminalState
  readonly items?: readonly unknown[]   // app-shaped section payload (opaque at the seam)
}

interface JournalContribution {
  readonly module: string               // string field, NOT a hard module ref (JR-3)
  readonly sectionKey: HomeSectionKey
  readonly dataPoints: readonly DataPoint[]           // advertised, user-selectable (JR-4)
  summary(date: string): SectionData | Promise<SectionData>   // date-keyed, deterministic (JR-7)
  dueIn?(range: DateRange): SectionData | Promise<SectionData> // agenda; reuses the Sessions primitive (JR-5)
}
```

## (A) Registry — for registering modules (ADR-004 factory pattern, mirrors `createEffectRegistry`)
```ts
interface JournalRegistry {
  register(def: JournalContribution): void        // dedup by `module` (re-register overwrites)
  list(): readonly JournalContribution[]          // DETERMINISTIC order: sectionKey (summary→agenda→entry) then module sort (IR-a2)
  get(module: string): JournalContribution | undefined
}
function createJournalRegistry(): JournalRegistry
```
- `createJournalRegistry()` returns an in-memory registry (no db — contributions are runtime code), mirroring
  `createEffectRegistry()` `[FACT: foundation/effects/registry.ts:19-30]`. The conceptual `registerJournalContribution(def)`
  in `contract.md:11-14` maps to `registry.register(def)`; the app wires one registry instance and passes it to the
  service + to registering modules (the `EffectRegistry`/`SessionRegistry` wire-up precedent). The throwing `apps/web`
  placeholder is superseded by this live registry `[FACT: contract.md:11-14 JR-3; journal-contribution.ts:45-58]`.

## (B) Engine — for the ② UI (`createJournalsService(deps) → JournalsService`)
```ts
interface JournalsServiceDeps {
  db: DrizzleDb
  deviceId: string
  registry: JournalRegistry           // the shared contribution registry the engine iterates (S1)
  preferences: PreferencesService     // global selection default (built ✅)
  // summary(date)/dueIn providers arrive via registered contributions, not a direct module import (IR-c)
}

interface JournalsService {
  buildDashboard(date: string, userSelection?: JournalSelection): Promise<DashboardData>
  captureSnapshot(date: string): Promise<JournalSnapshot>
  getJournal(date: string, opts?: { withLiveComparative?: boolean }): Promise<JournalView>
  buildReview(period: ReviewPeriod, schedule?: ReviewSchedule): Promise<ReviewData>
  getSelection(): Promise<JournalSelection>
  setSelection(perModule: JournalSelection): Promise<void>
}
```
- **`buildDashboard(date, userSelection?)`** → `{ summary: SectionData[], agenda: SectionData[] }`, each list in the
  deterministic order (IR-a2), per-section degrade (IR-d). Live for today. `[FACT: contract.md:17-18 JR-3/JR-5]`
- **`captureSnapshot(date)`** → freezes the **summary** sections (IR-e2) as a `journal_snapshots` row; single-row write
  (IR-e3). `[FACT: contract.md:19; schema/journals.ts:26-41]`
- **`getJournal(date, {withLiveComparative?})`** → today: live `buildDashboard`; past: latest snapshot for the date
  (IR-f), optional then-vs-now overlay; `SnapshotMissing` → flagged live re-aggregation (design-pass).
  `[FACT: contract.md:20 JR-6]`
- **`buildReview(period)`** → composes in-range snapshots (latest-per-date) into a `ReviewData` shell; throws
  `InsufficientHistory` when the period is empty; presents `analytics.ts` output (never recomputes). Named-period→range
  math + Wrapped composition + the `schedule`/delivery param = **design-pass** (S4 takes an explicit `{from,to}`)
  `[FACT: contract.md:21-22 JR-8/JR-10; identity.md:48-49]`.
- **`getSelection()/setSelection(perModule)`** → global default in Preferences + per-journal `summary_config` override
  (Notes read seam, N-3); no page write (JR-1). `[FACT: contract.md:23-24 JR-4]`

## Typed errors (thrown/returned)
`ContributionFailed(module, date)` · `SnapshotMissing(date)` · `InsufficientHistory(period)` ·
`ProviderUnavailable(module)`. `[FACT: contract.md:38-42]`

## Boundary invariants the seam enforces (from JR-1 / IR-c)
- The service **never** writes the journal `pages` row, re-declares NP-2, or owns the `/summary` block / free-form
  entry — those are Notes & Pages. Journals fills the block via `buildDashboard`; the UI wires it.
- The service **imports no feature module by name** — it depends only on `JournalContribution` (registry decouples).
- `analytics.ts` output is **presented, never recomputed**.
