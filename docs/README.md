# Documentation Manifest — Vida Platform
<!-- Produced by /documentation Phase 0 (documentation-blueprint). The MAP of what to document, at which
     level, in which aspect, and in what order. Reverse-mode (documenting the existing repo). No-Guessing:
     code structure ← repo-survey; modules + fill order ← module-dependency-graph; data ← ADR-002. -->
Status: Phase 0 complete + VERIFIED (2026-06-13). **Wave 0 + Wave 1 COMPLETE; Wave 2 started.** Wave-0 (**Notes & Pages**, **Preferences**) + Wave-1 (**Tasks**, **Habits**, **Finance**, **Relationships**, **Check-ins**) + Wave-2 (**Projects**) documented + verified (2026-06-18 → 2026-06-29) — 5 canonical aspect docs each, gate PASS. Wave 2 remaining: Routines · Journals · Learning. ⚠ A governing **extension-model principle** (ZK core + guarded opt-in integrations) was surfaced by Projects → candidate addition to `core/business-rules.md`. Feature aspect filenames aligned to the canonical 5 (see Levels × Aspects). Index layer wired (2026-06-18): `core/README.md` + `features/README.md` + level-README stubs. Remaining feature/service/component contexts not yet filled.

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
| 2 — Dependent | Projects · Routines · Journals · Learning |
| 3 — Higher-order | Languages (hard→Learning) · Purposes & Goals · Bucket List |
| 4 — Peripheral | Gamification · Notifications · Pomodoro |

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
| _(all other features/services/components)_ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

## Notes
- The survey pruned 76 dirs — the 17 modules **aren't implemented in code yet** (they live in the ADR-002
  schema + `@vida/types`). Feature specs are harvested from **ADR-002 + `@vida/types` + legacy life-os**, not code.
- M4 migrated `docs/architecture/` → `docs/core/architecture/` and `docs/decisions/` → `docs/core/decisions/`
  (git mv, history preserved); all internal path references updated.
