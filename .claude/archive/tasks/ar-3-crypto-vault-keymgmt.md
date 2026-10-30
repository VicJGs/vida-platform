# Task: ar-3-crypto-vault-keymgmt
# Status: planned
# Linear: LIF-74
# Project: M3 — Whole-OS Encryption Pass
# Milestone: M3.0 — Encryption Pass
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer

## Goal
Implement the client-side crypto core: Argon2id → Master Key → Vault Key = BLAKE2b-256 derivation
(the authoritative key model), XChaCha20-Poly1305 field encryption, and the vault unlock +
auto-lock lifecycle. Phase 1 needs L1 (SQLCipher-at-rest) + L2 (field-level) only — SRP handshake
(L3/server) defers to Phase 2. Gates onboarding (UX-5).

## Dependencies
- blocked by `ar-1-monorepo-topology`
