# Task: fix-data-plane-boot-open
# Status: planned
# Linear: LIF-250
# Profile: Bug Fix / Hotfix
# Project: M1 — Whole Manual OS
# Milestone: M1.2.4 — Live Close: shipped-surface debt
# Source: fe-calendar #19 S7 live Visual Gate (2026-10-22, PR #157) — Victor: "file the database boot problem as a fix needed (file it properly in the plan and also in the order)"
# Title: Data-plane boot: DB worker open times out (dev intermittent · prod build never opens)

## Goal
Repair the Done `data-plane-wiring` (#59, LIF-237, PR #148): the DB worker's `open` RPC times out after 15 s —
intermittently on the dev server (the app's Retry recovers), and on EVERY load of the production build (the worker never
requests its wasm). Then re-time the fe-calendar Year range on a booting production build (S7 budget ≤ 1 s).

## Bug unit (the analysis — §XXX TRIAGE)
`docs/specs/fixes/data-plane-boot-open/_index.md` — findings · facets (3 labelled hypotheses, root cause UNKNOWN) ·
files · acceptance (10/10 boots dev + prod · Year re-time · a production-build OPFS smoke).

## Order (golive-replan G3 placement rule)
`#60` in `delivery-structure-reconstruction/reconstructed-structure.md` — right after `data-plane-wiring` (#59), ahead of
the M1.2.4 debt units (L1/L2): a repair of a Done unit is debt (`g3-order.md` §1), and every live surface sits behind the
boot (BR-RT-BOOT). Wave **L0′** in `g3-order.md` §2. Plan row: `golive-replan/debt-plan.md` §1.

## Dependencies
- blocked by `data-plane-wiring`
