# Task: db-8b-blind-index
# Status: planned
# Cluster: M3 Whole-OS Encryption & Security Pass
# Milestone: Crypto & Boundary
# Phase: 1 (hardening)
# Source: docs/roadmap.md → M3

## Goal
Keyed blind index (`category_bidx`, keyed BLAKE2b, F7/D7) — the encrypted-search half split from DB-8 FTS5. Needs the encryption key, so it lands with the M3 crypto pass.

## Dependencies
- blocked by `db-8-fts5-search`
- blocked by `db-5-encryption-boundary-map`
