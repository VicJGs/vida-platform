# Projects — vida-platform
# Delivery-structure model (ADR-016): Project = a build TIER. Section order = tier build-order (project_order).
# Supersedes _clusters.md (the malformed M1.0/M1.4/M2/M3/M4-as-Projects layout). Milestones = delivery-slices.

## M1 — Whole Manual OS
The entire OS, every module operable by hand, unified by the internal connective layer, on localhost with encryption/sync/auth off. Done-when: every module manually operable AND the OS internally coherent.
### Milestones
<!-- Track-first M1.#.# (ADR-021): M1.0=flat cross-track opener · M1.1.*=Backend · M1.2.*=Frontend(P6) ·
     M1.4=flat cross-track CLOSER (Victor's cut, part-3-build-roadmap/_index.md:130 — coherence gate, NOT a backend
     arm; keeps its number). List ORDER drives tracker_sync --plan (milestone_index), so it is in delivery order. -->
- M1.0 — Boot & Connective Base
- M1.1.1 — Hub & Foundation · Backend
- M1.1.2 — Feature Modules · Backend
- M1.2.4 — Live Close: shipped-surface debt
- M1.1.3 — Depth & Recovered · Backend
- M1.2.1 — Hub & Foundation · Frontend
- M1.2.2 — Feature Modules · Frontend
- M1.2.3 — Depth & Recovered · Frontend
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
