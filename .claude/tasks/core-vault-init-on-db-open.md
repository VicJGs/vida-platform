# Task: core-vault-init-on-db-open
# Status: planned
# Linear: LIF-160
# Profile: Add Backend Component
# Project: M3 — Whole-OS Encryption Pass
# Milestone: M3.0 — Encryption Pass
# Source: claim-stub (2026-10-02) — was an unclaimed Linear orphan; real M3 work homed alongside ar-3

## Goal
Initialize the crypto vault on database open (vault unlock → key derivation → SQLCipher key install) so the
local DB is readable only within an unlocked session. A future M3 (Encryption Pass) unit — this is a claim-stub
so the issue is homed + no longer an orphan; the full spec is authored when M3 begins.

## Dependencies
- blocked by `ar-3-crypto-vault-keymgmt`
