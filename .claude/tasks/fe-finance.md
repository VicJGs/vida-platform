# Task: fe-finance
# Status: planned
# Linear: LIF-180
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.3 — Depth & Recovered · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #41 — #41 Finance ⊕split — Dash(switch) · account Entity · All-* · Chart · Store tree · Commitments · Import wizard. ⛔ service gate (GAP-2, gap2-schema-gates.md): leading backend-tagged slice = store service FIN-18/23/24 (real StoreLockPort) · Commitments derive FIN-36 + its liability slice FIN-39 (txn-link vs `liability_payments` resolved at the Interpretation Gate) · FX-rate store FIN-21; budgeting FIN-38 = front-matter design pass (Envision + Interpretation) + ADR authored here (minted separately only if the design pass splits it off); import_staging durable = p3-2 (M2) — the wizard runs over the M1 in-memory staging port.
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build (add-frontend-component) for finance — the UI/UX tier over the finished ① service (`mod-finance`), 29 UI legs. Consumer-pull: rides its backend twin's wave 1:1. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5). + the GAP-2 leading backend slice (store · Commitments + liability slice · FX-rate store) and the budgeting design pass + ADR in front matter.

## Dependencies
- blocked by `fe-codec-dashboard`
- blocked by `fe-codec-entity-facet`
- blocked by `fe-codec-canvas-graph`
