# Projects — vida-platform
# Delivery-structure model (ADR-016): Project = a build TIER. Section order = tier build-order (project_order).
# Supersedes _clusters.md (the malformed M1.0/M1.4/M2/M3/M4-as-Projects layout). Milestones = delivery-slices.

## M1 — Whole Manual OS
The entire OS, every module operable by hand, unified by the internal connective layer, on localhost with encryption/sync/auth off. Done-when: every module manually operable AND the OS internally coherent.
### Milestones
- M1.0 — Boot & Connective Base
- M1.1 — Hub & Foundation Modules
- M1.2 — Feature Modules
- M1.3 — Depth & Recovered Modules
- M1.4 — Internal-Integration Hardening

## M2 — External Integrations & Security Boundary
Working external integrations for localhost dogfood, pre-encryption, built against the encryption seam + ADR-014/015 ingestion guard. Head = provider selection.
### Milestones
- M2.0 — Integrations & Boundary

## M3 — Whole-OS Encryption Pass
Turn on L1 SQLCipher-at-rest + L2 field-[E] across ALL data; finalize the encryption boundary; re-verify the ingestion guard live. Gates any release beyond solo-localhost.
### Milestones
- M3.0 — Encryption Pass

## M4 — Venues / Multi-Device
Sync → auth → desktop/mobile → self-host → ZK-cloud. Needs a second device, hence last.
### Milestones
- M4.0 — Venues
</content>
