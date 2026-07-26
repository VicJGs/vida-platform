# Task: db-5-encryption-boundary-map
# Status: planned
# Cluster: M3 Whole-OS Encryption & Security Pass
# Milestone: Crypto & Boundary
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Map the field-level encryption boundary: classify every `[E]`-marked field (ADR-002 §4) and wire
it to `encryptRow`/`decryptRow` so sensitive fields are XChaCha20-Poly1305 encrypted at the
column level. Configure L1 SQLCipher whole-DB-at-rest. Defines exactly which columns are opaque
before the repository layer reads/writes them.

## Dependencies
- blocked by `db-4-per-domain-schema`
- blocked by `ar-3-crypto-vault-keymgmt`
