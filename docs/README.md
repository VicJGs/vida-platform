# Documentation Manifest — Vida Platform
<!-- Produced by /documentation Phase 0 (documentation-blueprint). The MAP of what to document, at which
     level, in which aspect, and in what order. Reverse-mode (documenting the existing repo). No-Guessing:
     code structure ← repo-survey; modules + fill order ← module-dependency-graph; data ← ADR-002. -->
Status: Phase 0 complete + VERIFIED (2026-06-13). **Wave 0 + Wave 1 COMPLETE; Wave 2 in progress.** Wave-0 (**Notes & Pages**, **Preferences**) + Wave-1 (**Tasks**, **Habits**, **Finance**, **Relationships**, **Check-ins**) + Wave-2 (**Projects**, **Learning: Education**, **Books** — extracted from Learning as its own module 2026-07-03, **Knowledge** — extracted from Learning as its own module 2026-07-10) + **Sessions & Scheduling** (extracted **+ PROMOTED** from Learning to a **foundation module** 2026-07-12) documented + verified (2026-06-18 → 2026-07-12) — 5 canonical aspect docs each, gate PASS. **Flashcards** was reframed into a **study-method service sub-context of Knowledge** (2026-07-12) — documented + verified, gate PASS; reference impl of **[ADR-005](core/decisions/ADR-005-study-method-service-framework.md)** (Study-Method Service framework; amends ADR-002). Learning is now ONE sub-context (Education). **Wave 2 remaining: Journals.** Sessions & Scheduling surfaced **[ADR-004 — Session Framework](core/decisions/ADR-004-session-framework.md)** (table-per-type storage + 4-dimension Integration Contract; Accepted 2026-07-12, amends ADR-002). ⚠ A governing **extension-model principle** (ZK core + guarded opt-in integrations) was surfaced by Projects → candidate addition to `core/business-rules.md` (Sessions' S5 permission dimension is an instance of it). Feature aspect filenames aligned to the canonical 5 (see Levels × Aspects). Index layer wired (2026-06-18): `core/README.md` + `features/README.md` + level-README stubs. Remaining feature/service/component contexts not yet filled.

## Structure (DECIDED — M1–M5, 2026-06-10)

```
docs/
├── README.md              this manifest
├── core/                  CORE level — system-wide truth (M4: architecture + decisions migrated IN)
│   ├── business-rules.md  the system constitution (18 invariants, cited)
│   ├── architecture/      system-overview · module-dependency-graph · cross-module-integration ·
│   │                      data-flow · platform-strategy · performance-strategy · security-model
│   └── decisions/         ADR-001 (tech-stack) · ADR-002 (data-model) · ADR-003 (sync-protocol)
├── features/              FEATURES level — the 17 modules (M1: renamed from modules/)
├── infrastructure/        SERVICES level (M2)
├── ui/  +  editor/        COMPONENTS level (M3) — Tamagui components + TipTap editor
└── platform/              per-platform app shells (web/mobile/desktop)
```
Note: legacy `docs/architecture.md` (root file) stays put — it is LEGACY, not for decisions `[[authoritative-docs]]`.

## Levels × Aspects

| Level | Home | Aspects |
|-------|------|---------|
| **Core** | `docs/core/` | Identity (architecture/system-overview) · **Business Rules** ✅ · Contract (server API) · Structure (decisions/ADR-002 + architecture/module-dependency-graph) · Conventions |
| **Features** (17) | `docs/features/<module>/` | **canonical 5 aspects** (aligned to core + framework, 2026-06-18): identity · business-rules · contract · structure-data · conventions. (`structure-data` absorbs the old state-management-map + page-map; the component catalog lives at the **Components** level, not per-feature.) |
| **Services** | `docs/infrastructure/` | identity · business-rules · contract · structure |
| **Components** | `docs/ui/` + `docs/editor/` | identity · behavioral-rules · props/states |

## Features — fill order `[FACT: docs/core/architecture/module-dependency-graph.md]`
| Wave | Modules |
|------|---------|
| 0 — Foundational | **Notes & Pages** (in-degree 14, the hub), **Preferences** |
| 1 — Independent | Tasks · Habits · Finance · Relationships · Check-ins |
| 2 — Dependent | Projects · **Books** (own module — EXTRACTED from Learning 2026-07-03, keeps its fill slot) · **Knowledge** (own module — EXTRACTED from Learning 2026-07-10, keeps its fill slot) · **Learning** (1 sub-context: Education; Flashcards → Knowledge study-method service 2026-07-12) · Journals  (Learning before Journals — Journals aggregates study) |
| F — Foundation | **Sessions & Scheduling** (own module — EXTRACTED **+ PROMOTED** from Learning 2026-07-12; session foundation + scheduling engine; ✅ documented + verified) |
| 3 — Higher-order | Languages (hard→Learning) · Purposes & Goals · Bucket List |
| 4 — Peripheral | **Routines** (re-sequenced here 2026-07-01 — the orchestrator; needs all modules it sequences documented first) · Gamification · Notifications · Pomodoro |
| **R — Recovered (v1 audit 2026-06-30 / -07-01)** | **Health** (exercise + nutrition — new domain) · **Duties** (needs defining intake) · **Skills** (separated from Learning — downgraded 2-table version, envisioned larger) · + expansions: Finance→**Commitments**, Projects→**Investigations**, Learning→verify Grades/Cycles. See [`intake/_scope-reconciliation-v1.md`](intake/_scope-reconciliation-v1.md). |

> ⚠ **Scope note (2026-06-30):** v1's `COMPLETE_SYSTEM_ARCHITECTURE.md` (91 tables/7 domains) planned scope the
> v2 rebuild dropped. Audit + Victor's KEEP decisions: [`intake/_scope-reconciliation-v1.md`](intake/_scope-reconciliation-v1.md).
> The "17 modules" below understated scope; recovered contexts (Health, Duties) + expansions (Commitments,
> Investigations) are now tracked in Wave R.

Services (`docs/infrastructure/`): encryption · sync · db-repository · core-services · utils `[FACT: survey packages/core layers]`.
Components: `@vida/ui` (`docs/ui/`) · `@vida/editor` (`docs/editor/`) `[FACT: survey]`.

## Fill order (overall)
Core → Wave 0 (Notes & Pages, Preferences) → Wave 1 → Services (as features need them) → Wave 2 → 3 → 4 → Components.

## Status tracker (⬜ not started · 🔄 in progress · ✅ done)
| Context | Identity | Business Rules | Contract | Structure | other aspects |
|---------|:--:|:--:|:--:|:--:|:--|
| Core | 🔄 architecture/* migrated | ✅ business-rules.md (verified) | 🔄 server-api.md (scaffold — routes unimplemented) | 🔄 ADRs + dep-graph migrated | ✅ conventions.md |
| Notes & Pages (Wave 0) | ✅ identity.md | ✅ business-rules.md | ✅ contract.md (⚠ designed iface — modules not yet coded) | ✅ structure-data.md | ✅ conventions.md |
| Preferences (Wave 0) | ✅ identity.md | ✅ business-rules.md | ✅ contract.md (⚠ designed iface — no @vida/types yet) | ✅ structure-data.md (⚠ 6 fields + visibility store INTENDED) | ✅ conventions.md |
| Tasks (Wave 1) | ✅ identity.md | ✅ business-rules.md | ✅ contract.md (⚠ services not coded) | ✅ structure-data.md (⚠ 5 additions → ADR-002 amendment) | ✅ conventions.md |
| Habits (Wave 1) | ✅ identity.md | ✅ business-rules.md | ✅ contract.md (⚠ core model empty) | ✅ structure-data.md (⚠ G8 4 fields + G7/G9 → ADR-002 amendment) | ✅ conventions.md |
| Finance (Wave 1) | ✅ identity.md | ✅ business-rules.md | ✅ contract.md (⚠ core empty) | ✅ structure-data.md (⚠ largest INTENDED surface: ZK-ingestion ADR + budgeting ADR + ADR-002 amendment) | ✅ conventions.md |
| Relationships (Wave 1) | ✅ identity.md | ✅ business-rules.md | ✅ contract.md (⚠ core empty) | ✅ structure-data.md (⚠ networks + closeness + graph + restored fields → ADR-002 amendment) | ✅ conventions.md |
| Check-ins (Wave 1) | ✅ identity.md | ✅ business-rules.md | ✅ contract.md (⚠ ZERO code) | ✅ structure-data.md (⚠ UNIQUE fix + 3 new types + cross-module review contract) | ✅ conventions.md |
| Projects (Wave 2) | ✅ identity.md | ✅ business-rules.md | ✅ contract.md (⚠ core empty) | ✅ structure-data.md (⚠ deliverables table + measurement system + extension-model principle → constitution + 2 ADRs) | ✅ conventions.md |
| Learning: Education (Wave 2, 1/5) | ✅ identity.md | ✅ business-rules.md | ✅ contract.md (⚠ ZERO service code) | ✅ structure-data.md (⚠⚠ 8-level hierarchy REFRAME — 14 INTENDED entities, largest ADR-002 amendment yet + 2 design passes) | ✅ conventions.md |
| Books (Wave 2, own module — extracted from Learning) | ✅ identity.md | ✅ business-rules.md | ✅ contract.md (⚠ ZERO service code) | ✅ structure-data.md (⚠⚠ MODULE REFRAME — work/asset model, annotations, plans; 2nd-largest ADR-002 amendment + mapping design pass) | ✅ conventions.md |
| Knowledge (Wave 2, own module — extracted from Learning 2026-07-10) | ✅ identity.md | ✅ business-rules.md | ✅ contract.md (⚠ ZERO service code) | ✅ structure-data.md (⚠⚠ MODULE REFRAME — user-extensible kinds+realms, container/tag org, pluggable methods/curves, notes→pages, Knowledge Lab; retires knowledge_notes/resource_type/SM-2 cols → ADR-002 amendment; KN-10 mastery source to Education) | ✅ conventions.md |
| _(all other features/services/components)_ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

## Notes
- ⚠ **Views need a build-time review pass (Victor, 2026-07-05).** The view/page structures documented per
  module (Wave 0→2) were captured at INTENT level and may carry gaps — the Books entity-modeling pass proved
  the pattern (B13–B16 surfaced only when correlations were drawn). Before building any module's UI, REVIEW
  its documented view structure, fill the gaps, and run the **/critique gate** on the refined views — the
  final deliverable must be the best UI/UX, not the intake sketch.
- The survey pruned 76 dirs — the 17 modules **aren't implemented in code yet** (they live in the ADR-002
  schema + `@vida/types`). Feature specs are harvested from **ADR-002 + `@vida/types` + legacy life-os**, not code.
- M4 migrated `docs/architecture/` → `docs/core/architecture/` and `docs/decisions/` → `docs/core/decisions/`
  (git mv, history preserved); all internal path references updated.
