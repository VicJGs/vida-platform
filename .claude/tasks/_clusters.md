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

# RETIRED (2026-07-26) — the old substrate-first Phase-1.0 layer-clusters ①–⑤ were superseded by the
# features-first M1→M4 clusters above (linear-projectize / ADR-019). All their issues were re-homed
# (M1.0/M1.4/M3). The five Linear Projects are now EMPTY and should be archived in the Linear UI
# (tracker_sync creates/updates but does not delete Projects). Definitions removed here so the tracker
# stops managing them.
