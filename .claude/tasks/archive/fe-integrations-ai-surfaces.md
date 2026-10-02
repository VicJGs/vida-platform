# Task: fe-integrations-ai-surfaces
# Status: retired
# Linear: LIF-186
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.2 — Feature Modules · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: RETIRED → DEFERRED to M2 (ADR-017 features-first; AI deferred). AI faces land as consent-gated capability blocks within modules when AI ships.
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
Thin VISIBLE cross-module config-face issue (integrations/AI cluster, 8 legs) — the net-new UI faces no single feature module owns: ingestion consent gate · egress audit-trail · import reconcile/review · Preferences integrations page · AI mode-choice · outgoing-context review · AI management page · grant/consent prompt. Rides the finished M1.1.2 twins (XS-ingestion/egress-guard/ai/capability). UI config faces only — no service logic (BR-2). Per-slice blocking Visual Gate.

## Dependencies
- blocked by `xs-ai`
- blocked by `xs-capability`
- blocked by `xs-egress-guard`
- blocked by `xs-ingestion`
