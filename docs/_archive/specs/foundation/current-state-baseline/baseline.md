# Current-State Baseline — Vida Platform Foundation

**Type:** Ground-truth baseline analysis (the §XXVI.1a No-Guessing input to a planning gate). **FINDINGS ONLY — no plan, no recommendations.**
**Date:** 2026-07-23 (§1–§6 snapshot) · **now also hosts the live `## Divergent Ledger`** consumed by `tracker_sync --census` (delivery-planning-loop Unit 2, ADR-015). The §1–§6 prose is a frozen snapshot; the ledger below is re-verified per authoring and self-audited by the census (BR-8).

> ⚠ The §1–§6 findings are the 2026-07-23 snapshot and are **stale on specifics** (e.g. §1's "472-LOC dead web-adapter.ts" is now 102-LOC/imported/aligned; the `schema.ts` continuity trap is resolved — quarantined to `db/_legacy/`). For live per-node state run `tracker_sync --census`; use §1–§6 for the historical framing only.
> **Session:** build-roadmap-resequence (framing held per decision C — this baseline decides the shape)
> **No-Guessing:** every claim labeled [FACT: evidence] / [INTERP: from X] / [UNKNOWN: needs Y]. Produced by 4 parallel read-only analyses over the code + git history + docs.

**Why this exists:** Victor's account — vida-platform was created to migrate `life_os` spec-by-spec; that migration stopped; the code left behind is stale residue that predates the project's real documentation foundation. The architecture was scaffolded _before_ the rigorous docs + ADRs, so it was never derived from them. This baseline establishes the current state across six anchored dimensions before any plan is drawn.

---

## Timeline (the spine of every finding) [FACT: git dates]

| Artifact                                                                                 | Authored                                                       | Note                                                                     |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Monorepo + full code scaffold "per architecture spec"                                    | **2026-03-16 → 03-27**                                         | Essentially the entire coded surface lands in one dump dated 2026-03-27. |
| Legacy `docs/architecture.md` (Multiplatform Guide v2)                                   | 2026-03-27                                                     | The scaffold's source-of-truth.                                          |
| ADR-001/002/003                                                                          | 2026-06-13                                                     | The floor the early docs cite.                                           |
| `docs/core/architecture/*` (8 docs)                                                      | **2026-06-13** (6 of 8); data-flow + security-model 2026-07-17 | Predate ADR-004+.                                                        |
| EARLY module docs (notes, preferences, tasks, habits, finance, relationships, check-ins) | **2026-06-18 → 06-28**                                         | Before ADR-004+.                                                         |
| ADR-004…012 (sessions, study-method, spaces/tags, capability, measurability, economy)    | **2026-07-12 → 07-19**                                         | The ripple-back decisions.                                               |
| ADR-016 (storage rebuild from zero), ADR-017 (features-first)                            | 2026-07-22, 07-23                                              |                                                                          |
| DB-1 schema primitives (`schema/_shared.ts`, `_registry.ts`, `index.ts`)                 | **2026-07-22**                                                 | The ONLY code authored after the docs.                                   |

**Load-bearing fact:** every ripple-back ADR (004–012) post-dates every early module doc by 2–4 weeks, and the entire code surface (except 3 DB-1 files) predates the ADRs by months.

---

## §1. Coded surface — exists / stale / residue / missing [FACT: file census + git dates + import graph]

**Scale:** ~105 meaningful `.ts/.tsx` files, ~8,459 LOC (excl. dist).

- **Built AFTER the documentation foundation: 3 files, 59 LOC (~0.7%).** Only the DB-1 primitives (`schema/_shared.ts` 39, `_registry.ts` 15, `schema/index.ts` 5), commit `b234e85` 2026-07-22. This is the _entire_ current, doc-derived beachhead.
- **Pre-documentation residue/stale: ~102 files, ~8,400 LOC (~99.3%).** Every non-empty file outside `schema/` carries a single 2026-03-27 commit (lone exception: `key-management.ts` got a 2026-06-08 null-guard, still pre-ADR).
- **Empty stubs dominate by count: 68 of ~105 files (65%) are 0-LOC** — the whole of `@vida/editor` (19), `@vida/ui` (8), `apps/mobile` (6), `core/models` (9), `core/services` (9), `core/sync` (3), `core/utils` (3), all app route files, empty server routes.
- **One substantial DEAD file:** `apps/web/src/db/web-adapter.ts` (472 LOC, real wa-sqlite/OPFS adapter) — imported by **zero** files.
- **The continuity trap:** `core/index.ts` does `export * as schema from './db/schema'`, which resolves to the **STALE v1 `schema.ts` file** (1,300 LOC), not the current `schema/` directory (file beats dir under bundler resolution — noted in `schema/index.ts:2-3`). So consumers (adapter, repository) bind to the stale monolith.

**MISSING (docs/roadmap require it → absent in code):** models/domain layer (9 empty), services/engines layer (9 empty), editor package body, UI package body, v2 per-table schema modules (no `schema/foundation/`, no `<domain>.ts`), Zod validators (DB-9), app boot/wiring, FTS5 tables (DB-8), dogfood seed (DB-10).

**[INTERP] Net:** the coded surface is ~99% pre-documentation residue and ~65%-by-count empty stubs, with a 0.7% doc-derived beachhead. The heaviest liability: the only substantial wired data-layer artifact (v1 `schema.ts` + `001_initial.ts`, ~80 tables) is the STALE one, which ADR-016 §1 independently rates **~60% misaligned / reference-only / delete-at-parity**.

---

## §2. Architecture-structure coherence vs the current documentation foundation [FACT]

**The code + arch docs both describe the pre-ADR "17-modules-over-ADR-001/002/003" world.** The five load-bearing post-ADR-003 structural primitives have **no table, model, service, type, or directory** anywhere in the tree (grep count 0):

| Substrate framework                                                                     | ADR     | Code home                                                 |
| --------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------- |
| Sessions supertype (`sessions`/`planned_blocks`/`applied_effects`)                      | ADR-004 | **ABSENT** (v1 has flat `study_sessions` instead)         |
| Spaces + universal `entity_tags`                                                        | ADR-006 | **ABSENT** (v1 has `tags`/`page_tags`, which 006 retires) |
| Capability/Block registry (`block_instances`/`capability_grants`)                       | ADR-008 | **ABSENT** (editor has a closed hand-kept extension set)  |
| Universal measurability (`measurement_kind`/`binding_mode`)                             | ADR-011 | **ABSENT**                                                |
| Points economy / consequence engine (`currencies`/`consequence_ledger`/`store`/`rules`) | ADR-012 | **ABSENT** (v1 has flat `xp_history`, which DB-3 retires) |

**Architecture docs currency:** 6 of 8 `docs/core/architecture/*` frozen 2026-06-13 (before ADR-004); the 2 updated (07-17) contain **zero** references to ADR-004+ (grep). `module-dependency-graph.md` is self-flagged stale in the roadmap ("predates ADR-004–013"). `system-overview.md:9` cites the legacy `architecture.md` as its content source — so the arch docs inherit legacy framing.

**Legacy `docs/architecture.md` contradicts current ADRs** [FACT: grep]: recommends **Automerge** (vs ADR-003 LWW/HLC), **HKDF** key derivation (vs ADR-001-amended BLAKE2b, which `vault.ts` implements), **shadcn/ui** (vs Tamagui), **D3.js/react-force-graph** (vs Sigma.js), **"8 major modules"** framing (superseded twice over). The 3 other named legacy docs (`sync-protocol.md`, `encryption.md`, `editor-blocks.md`) are **0-byte** empty.

**Secondary doc-drift:** CLAUDE.md itself is stale — cites `docs/decisions/` (actual: `docs/core/decisions/`), lists only ADR-001/002/003 in its Reference section, still names ADR-005-retired `flashcard_*` and pre-006 `page_tags` in its Data-Domains table.

**[INTERP — FINDING]:** the architecture (code structure + arch docs) is **INCOHERENT with the current documentation foundation (ADRs 004–017)**; it is coherent only with the earlier ADR-001/002/003 + legacy v2 guide it was scaffolded from. The divergence is systematic, not random drift — code and docs are internally consistent with _each other_ and jointly inconsistent with the ADR layer that now governs. What DOES match current ADRs: the 4-app layout and the ADR-017 seam posture (empty sync stubs, empty-passphrase adapter, DB-1 primitives) — the foundation-and-seams are current; the domain structure and arch docs on top are not.

---

## §3. Documentation currency — the "re-do the documentation gate" thesis [FINDING: SUPPORTED]

The early module docs are themselves stale, because later ADRs/modules changed the model underneath them. The strongest evidence: **the later docs declare the debt they created in the earlier ones.** Purposes (ADR-011's consumer): _"measurement_kind + binding_mode … lands on Tasks·Habits·Routines·Projects·Dreams·Health·Finance … each such module owes its own [INTENT] amendment."_ Those owed amendments do not exist (grep: `measurement_kind` = 0 hits in early docs). Gamification names Tasks/Habits/Finance/Check-ins as `grant_currency` feeders; none of those early docs reflect it.

| Early module        | lines | stale content                                                                                                                | invalidated by                                                                                                                                                                                |
| ------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **notes-and-pages** | 42    | still models `tags`+`page_tags`; `entity_links` CHECK as closed enum `EntityLinkTarget(33)` single-source                    | **ADR-006** (retires page_tags → universal `entity_tags`; demotes Notes from owner to consumer). Its 07-15 re-touch fixed only the pomodoro row. **Highest priority — the in-degree-14 hub.** |
| **tasks**           | 47    | no `measurement_kind`/`binding_mode`; no notion a timed task drives a Session or emits a gamification effect                 | ADR-011, ADR-004, ADR-012                                                                                                                                                                     |
| **habits**          | 65    | no measurability contract; still names the **retired** `purpose_habits` junction                                             | ADR-011, ADR-012, Purposes (retires junction → `contributions`)                                                                                                                               |
| **finance**         | 77    | inline→shared `page_tags`; missing the ADR-012 **Finance-owned `store`** Storage layer + `move_money`; unaware it's a feeder | ADR-006, ADR-012                                                                                                                                                                              |
| **relationships**   | 69    | inline tags → `page_tags`                                                                                                    | ADR-006                                                                                                                                                                                       |
| **check-ins**       | 63    | no measurability seam; unaware `check_in_streak*` migrates in + it's a feeder                                                | ADR-011, ADR-012                                                                                                                                                                              |
| **preferences**     | 45    | predates the ADR-012 `user_profile` split routing persona/modules/onboarding into it                                         | ADR-012 (lightest)                                                                                                                                                                            |

**Cross-cutting:** every early tagging doc names `page_tags`; `entity_tags` appears in **zero** early docs. **Phasing-maturity gap** [FACT]: late docs carry a two-tier "As-is (FACT floor) vs Intended (reframe)" split + a `§5.20` consolidation ledger + explicit RETIRE/NEW/AMEND enumeration + ADR-004/006/008/011/012 anchors — **all absent from the seven early docs**, which use a single flat table + "INTENDED additions" bullets and cite only ADR-001/002/003. The richness gradient (early avg ~58 lines vs late 70–105) is that structural difference, not padding.

**[Caveat — INTERP]:** the early docs were not careless — several _anticipated_ the direction (habits/finance flag "deprecate inline tags"; relationships names "a Notes & Pages refinement"). But anticipation ≠ the model: ADR-006 shipped a _different named primitive_ (`entity_tags`, open registry, `spaces`), and the early docs have no measurability/consequence vocabulary at all. The staleness is real substrate drift.

---

## §4. Missing-and-stale gap map, anchored to the roadmap [FACT]

Of the **35 Structural-Foundation deliverables** (DB-1…11 + AR-1…9 + DS-1…5 + UI-1…4 + UX-1…6):

| Layer                              |           Present-aligned            |           Stale            |      Missing       |                % present                 |
| ---------------------------------- | :----------------------------------: | :------------------------: | :----------------: | :--------------------------------------: |
| ① Database (11)                    | ~3.5 (DB-1, DB-6, DB-7\*, DB-5 seam) | 3 (DB-2, DB-3, DB-4-as-v1) |  4 (DB-8/9/10/11)  |      ~30% (on the STALE v1 schema)       |
| ② Architecture (9)                 |       3 (AR-1, AR-2, AR-3-off)       |             —              | 6 (AR-4/5/6/7/8/9) | ~33% (0 of 3 substrate frameworks exist) |
| ③ Design System (5)                |                  0                   |             0              |         5          |                  **0%**                  |
| ④ UI (4)                           |                  0                   |             0              |         4          |                  **0%**                  |
| ⑤ UX (6)                           |                  0                   |             0              |         6          |                  **0%**                  |
| Engines (12 day-one)               |                  0                   |             0              |         12         |                  **0%**                  |
| Foundation + feature modules (~27) |                  0                   |             0              |        ~27         |                  **0%**                  |

\* DB-7 runner is aligned but its DDL (`001_initial.ts`) creates the v1 80-table set → stale payload.

**Rollup:** ~17% present-aligned, ~9% stale (must be rebuilt/retired — the v1 schema), **~74% missing**. Layers ③④⑤, all 12 engines, and all ~27 modules are **0% present** — every corresponding file that exists is a 0-LOC stub. AR-5/6/7 (the three ADR-mandated substrate frameworks) are literally absent.

**[INTERP]:** the genuine foundation today is a thin technical spine on the ①/② axis only — a working DatabaseAdapter + web-adapter (AR-2), an encryption library behind an off-seam (AR-3), a table-agnostic repository + migration runner (DB-6/7), the DB-1 primitives, and a rich `@vida/types` (~2,600 LOC). Everything above the data seam is absent or stub. The app boots to a static `<h1>{APP_NAME}</h1>`.

**[FACT — ADR-017 caveat]:** the MISSING status of AR-3/AR-9/DB-5 (encryption/sync/boundary) is deferral-by-design (the hardening pass), not slippage. The MISSING status of AR-4/5/6/7, DS-_, UI-_, UX-\*, engines, and modules is the genuine build-frontier.

---

## §5. Convergent findings (the current-state truth)

1. **The code is not a foundation; it's a pre-foundation artifact.** ~99% of LOC predates the documentation foundation; the one wired data-layer artifact is the stale v1 schema (ADR-016: ~60% misaligned). Building on it _is_ the "mixing" to avoid.
2. **The architecture (code structure + arch docs) is coherent with the OLD foundation and incoherent with the current ADRs (004–017).** It was never re-derived from the docs that now govern it. Five substrate frameworks the ADRs mandate have zero structural home.
3. **The documentation foundation itself is uneven.** The early modules' docs (Notes, Preferences, Tasks, Habits, Finance, Relationships, Check-ins) are stale against ADR-004/006/011/012 and structurally thinner than the late docs — a re-run is warranted, driven by _named, enumerable_ ADR sources (not speculation). Notes & Pages is the priority (the hub, still declaring the retired `page_tags`).
4. **~74% of the roadmap's Structural Foundation is simply unbuilt** (0-LOC stubs), with the entire experience layer (DS/UI/UX), the engine tier, and the substrate-framework tier at literal zero.
5. **The legacy layer is identifiable and quarantinable:** `docs/architecture.md` (contradicts current ADRs on 5 axes) + 3 empty legacy docs; and CLAUDE.md has drifted (wrong ADR path, missing ADR-004+, stale table names).

---

## §6. Open UNKNOWNs (for the planning step to resolve — not answered here)

- [UNKNOWN] Whether `apps/desktop` (Tauri Rust files present, `src/` empty) and `apps/mobile` (route files present, `db`/`components` empty) scaffolds are current-intent or pre-ADR-017 leftovers. Both are Phase-2 per roadmap.
- [UNKNOWN] Per-line contradiction audit of `cross-module-integration.md`, `platform-strategy.md`, `performance-strategy.md` (dated 06-13; verdicts above are date+framing inference).
- [UNKNOWN] Whether `health/*` and `learning/education` (multi-file docs) carry the same early-vs-late phasing split.
- [UNKNOWN] Runtime behavior — this baseline is file contents, git dates, and grep presence/absence only; nothing was executed.

_This is the baseline. The plan is drawn from it next, through the gate — not here._

---

## Divergent Ledger

The **curated** input to `tracker_sync --census` (delivery-planning-loop Unit 2, ADR-015 · BR-4). `divergent` = code that
is **present in a live (non-`_legacy`) location but contradicts the docs** — a content judgment the census cannot make
mechanically, so it is listed here (node-attributed) and **self-audited by BR-8**: the census flags any row whose `Path`
is now absent or now `aligned` as `⚠ stale-ledger-entry`, so this table cannot silently rot like §1–§6 did.

Rules: one row per divergent path · `Issue` = the delivery-plan node id (e.g. `AR-7`) · `Path` = repo-relative ·
**every row re-verified against the live tree when added** (never copied from the §1 snapshot). Mechanically-detected
debt (`orphan`, `quarantined`) is NOT listed here — the census computes those from the tree directly.

| Issue | Path | Note |
| ----- | ---- | ---- |

<!-- (currently empty) The ADR-018 reorg + AR-2/5/6 builds resolved baseline §1's divergences: web-adapter.ts → aligned;
     the v1 schema.ts monolith → quarantined (db/_legacy/, a distinct census class, not divergent). No live non-legacy
     wired-but-wrong file is known today. Add rows here as new divergence appears; BR-8 keeps them honest. -->
