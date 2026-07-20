# Cluster Metadata — vida-platform
# The sidecar tracker_sync.py reads to set each Linear Project's DESCRIPTION and its STRICT
# milestone list. One `## <cluster>` section per Project. Text between the `## ` line and the
# first `###` = the Project description (Linear caps this at 255 chars — keep it tight). Items
# under `### Milestones` = the strict milestone names, in order. Cluster names here MUST match
# the `# Cluster:` anchor in the task files exactly.
#
# Scope: Phase 1.0 — Structural Foundation (clusters ①–⑤). Phase-1 modules and Phase 2/3 clusters
# are added when their phase begins.

## ① Database Layer
Consolidated schema in `packages/core`: migrates clean, encrypts per field, seeds a dogfood vault. Fulfills ADR-002 §5.20 — consolidation, per-domain schema, encryption boundary, repository, migrations, FTS5, enums. Leads Phase 1.0.
### Milestones
- Schema
- Encryption & Repository
- Migrations & Search
- Reconciliation

## ② Architecture Layer
The app boots, unlocks a vault, routes, holds state. Monorepo topology, platform-agnostic DatabaseAdapter (wa-sqlite/OPFS), crypto/vault lifecycle, state/routing/forms, Sessions/Spaces/Capability substrates (ADR-004/006/008), no-flush sync scaffolding.
### Milestones
- Boot & Adapter
- Crypto & App Runtime
- Substrates
- Services & Sync Scaffold

## ③ Design System
A coherent visual language as tokens + Tamagui theme + primitive contracts: the Figma→Tokens Studio→Style Dictionary pipeline, color/type/spacing/shadow foundations, motion, dark mode, and the primitive contracts UI-1 builds against. DS blocks UI.
### Milestones
- Tokens & Foundations
- Theme & Primitives

## ④ UI
The shared component library + platform views + editor + app shell: `@vida/ui` primitives from the DS contracts, platform views (calendar/gallery/list/neural-graph/timeline), `@vida/editor` (TipTap + blocks + serializers), and app-shell components.
### Milestones
- Component Library
- Editor & Shell

## ⑤ UX
Information architecture, navigation, and interaction conventions set before modules arrive: module map + routing tree, command bar + search, responsive shell, empty/loading/error + keyboard rules, vault-unlock + onboarding, Home = the Journal dashboard.
### Milestones
- IA & Navigation
- Shell & Conventions
- Onboarding & Home
