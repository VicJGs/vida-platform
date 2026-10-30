# Task: db-8b-blind-index
# Status: planned
# Linear: LIF-99
# Project: M3 — Whole-OS Encryption Pass
# Milestone: M3.0 — Encryption Pass
# Phase: 1 (hardening)
# Source: docs/roadmap.md → M3

## Goal
Keyed blind index (`category_bidx`, keyed BLAKE2b, F7/D7) — the encrypted-search half split from DB-8 FTS5. Needs the encryption key, so it lands with the M3 crypto pass.

## Dependencies
- blocked by `ar-3-crypto-vault-keymgmt`
- blocked by `db-8-fts5-search`

