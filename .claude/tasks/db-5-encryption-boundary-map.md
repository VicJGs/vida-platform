# Task: db-5-encryption-boundary-map
# Status: planned
# Linear: LIF-67
# Project: M3 — Whole-OS Encryption Pass
# Milestone: M3.0 — Encryption Pass
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Map the field-level encryption boundary: classify every `[E]`-marked field (ADR-002 §4) and wire
it to `encryptRow`/`decryptRow` so sensitive fields are XChaCha20-Poly1305 encrypted at the
column level. Configure L1 SQLCipher whole-DB-at-rest. Defines exactly which columns are opaque
before the repository layer reads/writes them.

## Dependencies
- blocked by `ar-3-crypto-vault-keymgmt`
- blocked by `mod-notes`
- blocked by `mod-preferences`
- blocked by `mod-journals`
- blocked by `mod-spaces`
- blocked by `mod-sessions`
- blocked by `mod-checkins`
- blocked by `mod-tasks`
- blocked by `mod-habits`
- blocked by `mod-finance`
- blocked by `mod-relationships`
- blocked by `mod-projects`
- blocked by `mod-books`
- blocked by `mod-knowledge`
- blocked by `mod-learning`
- blocked by `mod-routines`
- blocked by `mod-gamification`
- blocked by `mod-notifications`
- blocked by `mod-purposes`
- blocked by `mod-health`
- blocked by `mod-skills`
- blocked by `mod-finance-commitments`
- blocked by `mod-projects-investigations`
- blocked by `mod-languages`
- blocked by `mod-bucket-list`
- blocked by `mod-duties`
- blocked by `mod-fiscal-legal`

