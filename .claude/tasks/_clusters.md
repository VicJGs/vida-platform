# Cluster Metadata — vida-platform
# The sidecar tracker_sync.py reads to set each Linear Project's DESCRIPTION and its STRICT
# milestone list. One `## <cluster>` section per Project. Text between the `## ` line and the
# first `###` = the Project description (Linear caps this at 255 chars — keep it tight). Items
# under `### Milestones` = the strict milestone names, in order. Cluster names here MUST match
# the `# Cluster:` anchor in the task files exactly.
#
# Scope: Phase 1.0 — Structural Foundation (clusters ①–⑤). Phase-1 modules and Phase 2/3 clusters
# are added when their phase begins.

## M1.0 Boot & Connective Base
Boot + foundation for the whole OS (features-first, ADR-017/018): app boot, DatabaseAdapter, per-feature DB spine (encryption off), the foundation/ substrates, cross-cutting services, DS/UI/UX shell. Crypto and sync activation deferred to M3/M4.
### Milestones
- Boot & DB spine
- Substrates
- Design System
- UI
- UX & Shell

## M1.4 Internal-Integration Hardening
The M1 tail that makes the OS viable as a daily driver: ADR-002 reconciliation from the per-feature schema, plus the summary(date) aggregation, measurability/economy rollups, and backlinks that tie the modules together. Closes M1.
### Milestones
- Reconciliation & Rollups

## M2 External Integrations & Security Boundary
External data feeds co-built with the ADR-014/015 ingestion guard: provider-selection head, then Financial/Health/AI/Fiscal/Calendar integrations with external_in/out_ok grants and leak decisions. Built against the encryption seam. Precedes M3.
### Milestones
- Provider Selection
- Integration Families

## M3 Whole-OS Encryption & Security Pass
The hardening-at-rest (ADR-002/017/019): turn on L1 SQLCipher + L2 field-level [E] across all data; crypto/vault/key-mgmt; keyed blind index; vault-unlock flow; re-verify the ingestion guard live. Gates any release beyond solo-localhost.
### Milestones
- Crypto & Boundary
- Verify & Release

## M4 Venues / Multi-Device
Multi-device + release venues (ADR-003/017): activate sync (LWW/HLC/Yjs) + server + SRP auth, then desktop (Tauri), mobile (Expo), self-host, and ZK-cloud. Needs encryption beneath (M3).
### Milestones
- Sync & Server
- Desktop & Mobile
- Self-Host & Cloud

## ① Database Layer  [RETIRE after re-home — superseded by M1.0/M3/M1.4]
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
