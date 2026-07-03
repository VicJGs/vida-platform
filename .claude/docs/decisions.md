<!-- Last updated: 2026-07-03 by /session-end -->
| Date | Area | Decision | Choice | Reason | Reversible |
|------|------|----------|--------|--------|------------|
| 2026-06-27 | habits | streak semantics | consecutive scheduled occurrences, no grace; counters derive from ledger | one source of truth; cache never lies | yes |
| 2026-06-27 | finance | account balance source of truth | ledger-derived (opening_balance + Σ transactions) | balances can't drift; import-friendly | costly |
| 2026-06-28 | relationships | neural graph edges | contact↔network membership only, no contact↔contact table | matches Victor's model; less schema | yes |
| 2026-06-29 | constitution | extension-model principle | ZK core + guarded OPT-IN integrations; user owns the risk | resolves every external-data/AI tension at once | no (principle) |
| 2026-06-29 | projects | deliverables | dedicated table + multi-type measurement (financial/stats/3rd-party/logs/artifacts) | real 4-level hierarchy; deep progress picture | costly |
| 2026-06-30 | scope | v1 audit — dropped modules | KEEP all: Health, Duties, Skills(separated), Finance→Commitments, Projects→Investigations → Wave R | intent must be tracked, not silently cut | yes |
| 2026-07-01 | process | Routines re-sequenced to Wave 4; Learning split into 5 sub-contexts | document dependencies first; one context per pass | orchestrator needs its modules; token discipline | yes |
| 2026-07-02 | learning | Education hierarchy reframe | 8 levels: Institution/Self-taught→Program→Curriculum→Degree→Term→Subject→Module→Topic (optional depth) | flat courses ≠ envisioned academic structure | costly |
| 2026-07-03 | learning | grading + progress | grading_systems builder (weighted components, modality); progress = Projects measurement pattern FORGED separately | matches real professor practice; no cross-module data mixing | yes |
| 2026-06-07 | setup | toolkit initialized on existing repo | Generic Coding Session | wire up toolkit without regenerating existing CLAUDE.md | yes |
| 2026-06-07 | setup | rename Claude.md → CLAUDE.md | git mv | cross-platform memory loading (case-sensitive CI) | yes |
| 2026-06-08 | build | declare cross-package imports as deps | `@vida/types: workspace:*` in core | tsc --noEmit resolves bare specifiers via node_modules, not tsconfig references | yes |
| 2026-06-08 | core | unlockVault return value | return `keyChain.vault_key` not `_vaultKey` | avoid null-widening of module-level mutable across call boundary | yes |
