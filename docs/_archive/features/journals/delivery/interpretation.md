<!-- Interpretation Layer — features/journals · Entity Delivery Flow Step 1 (add-backend-component / Default)
     Unit: mod-journals #39 (LIF-127) · M1.1.1 — Hub & Foundation · Backend · the ① service tier (engine + registry).
     Purpose: make the implicit explicit before decomposing. Every claim [FACT: path:line] / [INTERP] / [INTENT]. -->

# Interpretation — Journals service tier (①)

**What this unit builds.** The `@vida/core/services/journals` service tier — the **engine + provider registry** behind
the journal daily dashboard. Journals is the _integration layer_: it aggregates every module's contribution into a
day's summary + agenda, freezes days as snapshots, and composes snapshots into reviews. It owns the ENGINE; it never
owns the journal page `[FACT: docs/features/journals/business-rules.md:12-14 JR-1]`. The service is **0 lines today**
`[FACT: packages/core/src/services/journals/CLAUDE.md — dir + placeholder only]`; the contract signatures are the
documented target, not enforced reality `[FACT: contract.md:5-7]`. This is a service-only build; the one table it owns
(`journal_snapshots`) is already authored + migrated `[FACT: db/schema/journals.ts:26-41; migrations/030_journals.ts]`.
The ② frontend (Journal views: calendar/list/gallery, the Wrapped review UI, per-module selection controls) is a
separate frontend issue.

---

## DEPENDENCIES — what must already exist (and does)

- **`journal_snapshots` + migration 030 (OWNED, exists).** Columns: `id` (UUIDv7 PK), `snapshot_date` TEXT (YYYY-MM-DD,
  indexed `idx_journal_snapshots_date`), `sections_data` TEXT **`-- [E]`** (app-stringified per-section JSON),
  `captured_at` INTEGER (Unix ms — the row's only timestamp), + `syncColumns`. **NO baseColumns** (no
  created_at/updated_at/deleted_at — frozen-ledger, `check_in_template_questions` precedent). **NO `UNIQUE(snapshot_date)`**
  `[FACT: db/schema/journals.ts:26-41; migrations/030_journals.ts:14-19]`.
- **Sessions service (built ✅, LIF-139) — the `dueIn()` primitive.** The agenda half reuses the shared
  `dueIn(range)` scheduling primitive that Sessions + the Global Calendar already feed
  `[FACT: business-rules.md:24 JR-5; contract.md:32; services/sessions/service.ts]`. Journals does not re-implement it.
- **Preferences service (built ✅, LIF-133) — the per-module selection default.** The global default for what shows
  in a journal lives in Preferences; the per-journal override lives on `pages.summary_config`
  `[FACT: business-rules.md:22 JR-4; contract.md:33; services/preferences/service.ts]`.
- **The generic Repository** — `createRepository(db, table, {encryptedFields, deviceId, softDelete})`: encrypt-on-write /
  decrypt-on-read + co-transactional `sync_queue` enqueue on every mutation `[FACT: db/repository.ts:236-497]`.
- **`@vida/types` — `JournalSummaryConfig` colocated in `note.ts`.** `{ showHabits?, showTasks?, showStudySessions?,
showTransactions?, showInteractions? }` (the 5 shipped toggles) + `Page.summary_config: JournalSummaryConfig | null`
  **[E]** + `Page.journal_date` `[FACT: packages/types/src/note.ts:79-85,100-108]`. The registry/engine types
  (`JournalContribution`, `SectionData`, `DataPoint`, `DateRange`) are **NOT** in `@vida/types` yet — they exist only as
  local frontend copies (see the seam below).
- **The frontend contribution seam (placeholder, UX-6).** `apps/web/src/home/journal-contribution.ts` defines
  `JournalContribution` / `SectionData` / `DataPoint` / `DateRange` **locally** and `registerJournalContribution()`
  **throws `JournalSeamNotActivated`** "until MOD-journals (M1.1)" `[FACT: apps/web/src/home/journal-contribution.ts:45-58]`.
  Its `sectionKey`/`HomeSectionKey` (summary|agenda|entry) + `TerminalState` reuse are the shape the backend must
  supersede/feed. **This unit is what activates that seam.**
- **`entity_links` + `createBacklinkResolver` (built ✅, AR-8) — layered, not core.** `getBacklinksTo/getLinksFrom/
resolveLink` over `entity_links` `[FACT: services/search/backlink-resolver.ts:23-32; schema/foundation/spaces.ts:63-79]`.
  Only needed if/when the journal renders `[[links]]` — a J6 _layered_ concern, not the M1.1.1 engine core.

## NEEDS — implicit work the docs imply but don't spell out as steps

- **N-1 · The registry + its types are net-new in `@vida/core`, lifted from the frontend placeholder.** The engine
  (`buildDashboard`) _iterates_ the registry `[FACT: contract.md:17-18 JR-3]`; the only registry today is the inert
  frontend one that throws `[FACT: journal-contribution.ts:45-50]`. The backend must own the real registry so all
  platforms + the service consume one source. → **the canonical `JournalContribution`/`SectionData`/`DataPoint`/
  `DateRange` types move to `@vida/types`** (grep confirms they are NOT in `note.ts` — only `JournalSummaryConfig` is
  `[FACT: note.ts:79-85]`), and `registerJournalContribution` becomes a live `@vida/core` registry (the ADR-004
  registry pattern — `SessionRegistry`/effect rail/`dueIn` precedent `[FACT: contract.md:14; journal-contribution.ts:1-5]`).
  The frontend seam then re-exports/consumes it. **This is an architectural home decision → `/adr-check` at Step 5.**
- **N-2 · No provider registers at BUILD time — registration is first-consumer-pull.** JR-3: "adding a module never
  edits the journal" `[FACT: business-rules.md:17-19]`. Modules register _themselves_ at runtime; at M1.1.1 the engine
  ships the registry + iteration, and providers (Habits/Tasks/Finance/…) wire in as they are built. Same shape-class as
  the recent XS heads (measurement/templates: build the substrate that has a consumer now, document the rest as
  first-consumer-pull seams) `[INTERP: memory reconciliation-check-decomposition-consumer-column-before-build-now]`.
- **N-3 · Selection STORAGE does not exist on EITHER end yet (corrected at S2 build, grounded in the schema).**
  JR-4 wants "global default in Preferences + per-journal override in `summary_config`" `[FACT: contract.md:23-24;
business-rules.md:22]`. But **(a) Preferences has no journal-selection field** — only `dashboard_layout`/
  `default_dashboard_view`, neither the per-module `Record<module,dataPointId[]>` `[FACT: schema/preferences.ts:55-57;
entities/user.ts:209-211]`; and **(b) `summary_config` is still the OLD 5-toggle `JournalSummaryConfig`**
  (`showHabits`…), NOT the generalized per-module shape `structure-data.md:28-29` mandates `[FACT: note.ts:79-85]`.
  Adding either is a **schema change**, which this service-only issue is not. → **persisted `getSelection`/`setSelection`
  are first-consumer-pull SEAMS**; the pure `resolveSelection` (global ⊕ per-journal override, override-wins per module)
  builds now and `buildDashboard(date, userSelection?)` takes the selection as a **param** (the ② UI passes it) with a
  computed default fallback. The engine needs no storage to function `[FACT: apps/web/src/home/selection.ts
resolveSelection; contract.md:17 buildDashboard(date, userSelection)]`.
- **N-4 · `sections_data` is app-serialized JSON.** `captureSnapshot` freezes the per-section aggregate as a stringified
  JSON blob into the `text` column; `getJournal` parses it back `[FACT: schema/journals.ts:31 "app-stringified"; JR-7]`.
  A malformed/legacy blob must degrade, not crash (mirrors the Preferences IR-e JSON-degrade rule).
- **N-5 · Typed errors are named in the contract but unbuilt.** `ContributionFailed(module, date)`,
  `SnapshotMissing(date)`, `InsufficientHistory(period)`, `ProviderUnavailable(module)` `[FACT: contract.md:38-42]` →
  author in `services/journals/types.ts` (the Sessions/Preferences `./types` precedent `[FACT: services/sessions/service.ts:99-105]`).

## ORGANIZATION — ownership boundaries + how the code is shaped

- **OWNS** `[FACT: business-rules.md:12-14 JR-1]`: the journal-contribution **registry**; `buildDashboard(date, sel)`
  (summary via registry `summary(date)` + agenda via `dueIn(today)`); `captureSnapshot(date)` / `getJournal(date)` over
  `journal_snapshots`; `buildReview(period, schedule)` (compose snapshots — internals **design-pass**
  `[FACT: contract.md:22 JR-8]`); `getSelection/setSelection` (global). Physical home:
  `packages/core/src/services/journals/` `[FACT: services/journals/CLAUDE.md]`.
- **CONSUMES (via documented integration points, never direct module tables** `[FACT: contract.md:26-33]`**):** Sessions'
  `dueIn()`; Preferences' selection default; `analytics.ts` computed metrics (reviews _present_, never recompute — JR-10
  `[FACT: business-rules.md:38-39]`); registered module contributions (`summary(date)`).
- **DELEGATES (never builds):** the journal `pages` row + NP-2 one-per-date + the `/summary` block interface + the
  free-form TipTap entry → **Notes & Pages** `[FACT: business-rules.md:12-14 JR-1]`; metric math → `analytics.ts`;
  review scheduling/delivery → Notifications + Sessions (Wave 4 forward-dep) `[FACT: contract.md:34-35]`.
- **first-consumer-pull SEAMS (0 code now, pulled by the owner):** every module's provider registration (N-2); the
  `pages.summary_config` per-journal-override read (N-3); the Purpose/Gamification/Notifications forward-deps
  (stubbed, wired at their fill) `[FACT: contract.md:34-35; business-rules.md:35-37 JR-9]`; Check-ins section
  (deferred, J8) `[FACT: contract.md:36]`.
- **Factory-object service** — `createJournalsService(deps) → object literal`; intra-service calls via hoisted closures,
  **never `this.`** (breaks on the destructure consumption shape) `[FACT: services/preferences/service.ts:279-280;
services/sessions/service.ts:177-232; memory factory-service-no-this-for-intra-calls]`. Validating methods are `async`
  `[FACT: services/preferences/service.ts:256-268]`.

## IMPLICIT RULES — invariants a mock would hide (backstopped by the live-store Verification Gate)

- **IR-a · `initVault()` is required even with an empty runtime `[E]` set.** Every repository mutation runs
  `computeSyncHash → hashContent` (the encryption path) regardless of `encryptedFields`
  `[FACT: db/repository.ts:339-340,162-169; memory m10-repos-use-empty-encryptedfields-seam]`. The live-store smoke for
  `captureSnapshot` must init the vault or the write throws.
- **IR-a2 · `buildDashboard` output order MUST be deterministic — never registration/Map-insertion order.** The engine
  iterates the registry, but a `Map`/registration-order emit is non-deterministic across devices (LWW gives no
  registration-order guarantee → the same day renders sections differently per device). → sections emit in a **declared
  order** (fixed `section_key` order summary→agenda→entry, then a stable per-contribution key — e.g. `module` string
  sort) `[INTERP: ZK multi-device determinism; business-rules.md:23-24 two-halves; journal-contribution.ts sectionKey]`.
  A `captureSnapshot` that froze a non-deterministic order would produce non-reproducible records (breaks JR-7).
- **IR-b · `encryptedFields: []` is the M1.0 pass-through — the `-- [E]` on `sections_data` is the future boundary, not
  the runtime set.** Auth is OFF in M1.0 (ADR-017:20-22); _every_ M1.0 service uses `encryptedFields: []` even for
  `[E]`-marked columns (`sessions.key_learnings`, `entity_links.context`) `[FACT: services/search/backlink-resolver.ts:36-40;
memory m10-repos-use-empty-encryptedfields-seam]`. → journals mirrors that: `encryptedFields: []` now; `sections_data`
  encryption activates with the vault (M3). This is the **grounded M1.0 convention, not an open decision**
  `[INTERP: ADR-017:20 + the whole-M1.0 pattern; memory stale-source-plus-live-convention-is-fact-not-a-decision]`.
- **IR-c · No cycle — the engine sits ABOVE the modules.** Journals imports NO module by name; it depends only on the
  contribution _contract_. Notes & Pages (Wave-0) never depends on journals `[FACT: business-rules.md:15-16 JR-2]`.
  This is why the registry (not direct imports) is the mechanism.
- **IR-d · Per-section degrade, never a blank journal.** A provider that throws on `summary(date)` degrades **that
  section** to an explicit empty/error state (`ContributionFailed`); the rest renders `[FACT: business-rules.md:42-43,60]`.
  `buildDashboard` must isolate each provider call (try/catch per contribution), never let one throw abort the assembly.
- **IR-e · Snapshot immutability — today=live, past=snapshot.** `getJournal(today)` re-aggregates live; `getJournal(past)`
  reads the frozen row `[FACT: business-rules.md:27-31 JR-6/JR-7]`. Snapshots carry no updated_at/deleted_at — a captured
  day is frozen; whether a later backfill re-captures is **design-pass** `[FACT: business-rules.md:44-45; migrations/030:18]`.
- **IR-e2 · `captureSnapshot` freezes the SUMMARY (backward-looking) only — never the agenda.** The agenda is forward
  (`dueIn(today)`); freezing it into a _past_ record is meaningless. `sections_data` = the aggregated **summary** sections
  `[FACT: contract.md:19 "freezes the day's aggregated summary"; structure-data.md:16-18]`. A `captureSnapshot` slice
  serializes summary sections; the agenda is a live-dashboard-only half (JR-5).
- **IR-e3 · `captureSnapshot` is a single-row write — no multi-entity transaction.** It read-aggregates via providers
  (no writes) then inserts one `journal_snapshots` row; the Repository owns the co-transactional `sync_queue` enqueue
  `[FACT: db/repository.ts:236-497]`. No cross-table txn boundary to manage here.
- **IR-f · Snapshot uniqueness is app-level (no DDL constraint).** No `UNIQUE(snapshot_date)` exists
  `[FACT: schema/journals.ts:38]`; `getJournal(past)` must resolve deterministically (latest `captured_at` for the date)
  and `captureSnapshot` must decide re-capture vs skip — resolve to _latest-wins read_ now, re-capture policy design-pass.
- **IR-g · Reviews present, never compute; insufficient history is explicit.** `buildReview` composes snapshots +
  presents `analytics.ts` output; a period lacking data returns an explicit `InsufficientHistory`, never a misleading
  recap `[FACT: business-rules.md:38-39,46-47; contract.md:41]`. Internals are design-pass — build the compose-skeleton
  - the terminal states, not the Wrapped math.

## Grounded resolutions for the Decomposition Gate (not open forks — each doc- or architecture-determined)

1. **Registry home = `@vida/core` (architecture-FORCED, not a fork).** `@vida/core` cannot import `apps/web`
   (dependency direction, ADR-018), and the backend `journal-service` (in `@vida/core`) must iterate the registry →
   the registry MUST live in `@vida/core`; canonical types in `@vida/types`; the `apps/web` placeholder becomes a
   re-export/consumer. `/adr-check` at Step 5 is **confirmation vs ADR-004 (registry pattern) + ADR-018 (boundaries)**,
   not a decision `[FACT: structure-data.md:44 "reuses ADR-004"; identity.md:24-27 cycle argument]`.
2. **`buildReview` depth = compose-skeleton + terminal states now; Wrapped math + scheduling/delivery = design-pass**
   (JR-8/JR-9 forward-deps to Purpose/Gamification/Notifications) `[FACT: contract.md:22; business-rules.md:32-37;
identity.md:48-49; structure-data.md:48]`.
3. **Selection = pure `resolveSelection` + `buildDashboard(date, userSelection?)` param now; persisted
   `getSelection`/`setSelection` = SEAMS** (N-3, corrected: neither the Preferences field nor the generalized
   `summary_config` exists; adding them = schema change, out of ①). No page write, ever (JR-1)
   `[FACT: schema/preferences.ts:55-57; note.ts:79-85; business-rules.md:22 JR-4]`.

## Step 1.5 — Envision Gate: **N/A**

Pure-backend service tier — it renders no surface a user forms a mental model of (entity-delivery-flow.md §3.75). The
Journal views + Wrapped review UI + per-module selection controls belong to the ② frontend issue, where the Envision
Gate applies. Stated, not skipped.
