Date: 2026-09-21 — xs-notifications-delivery #46 (LIF-174) — M1.1.2 head — BUILD (Entity Delivery Flow)
Task: xs-notifications-delivery · Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow v1) · branch xs-notifications-delivery

Goal: build the ADR-013 zero-knowledge notification DELIVERY engine (foundation/notifications-delivery) — 17 legs
(XCU-01…12, 14–18), pure decision/routing tier + deny-safe/fail-closed ports, NO schema. XCU-13 (device-registry
columns) is ADR-003/sync-owned, out of scope. The LAST M1.1.2 XS security service.

Starting from scratch (greenfield — reminder-engine.ts = 0 bytes; server has no notification route).
Front matter: baseline → interpretation → decomposition (Approval 1) → per-slice build.
