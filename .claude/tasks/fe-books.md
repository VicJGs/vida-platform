# Task: fe-books
# Status: planned
# Linear: LIF-178
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.3 — Depth & Recovered · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #36 — #36 Books ⊕split — Bookshelf · Book Hub · Reader · Plans/Quotes · wizards.
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build (add-frontend-component) for books — the UI/UX tier over the finished ① service (`mod-books`), 32 UI legs. Consumer-pull: rides its backend twin's wave 1:1. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## golive-replan absorption (G4, 2026-10-21)
Debt this issue absorbs (`docs/specs/foundation/golive-replan/debt-plan.md` §2 · coverage-report.md): canvas-reader ❌ EC-8 photo-saved-text-pending (IR-4) · BK-4 position mapping (Reader consumer).

## Dependencies
- blocked by `fe-codec-collection`
- blocked by `fe-codec-canvas-reader`
- blocked by `fe-codec-entity-facet`
