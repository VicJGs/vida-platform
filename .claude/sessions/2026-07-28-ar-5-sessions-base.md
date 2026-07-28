# Session: 2026-07-28 — ar-5-sessions-base

Task initialized. Goal: build the AR-5 Sessions substrate — the `sessions` table-per-type model plus the
integration contract (guarded-write + idempotency + effect rail + effect catalogue, ADR-004 §3.2.5) that
AR-7 capability / measurability / economy inherit-by-reference.

Linear: LIF-76 · M1.0 substrate SPINE · cluster "M1.0 Boot & Connective Base".
Prereqs done: db-6 ✅ (repository / sync_queue producer) + db-9 ✅ (canonical enums + Zod).
Home: `packages/core/src/foundation/sessions`.

Starting from scratch. Next: §XXVI Step 0 — /document-context baseline on the context(s) to touch (grep the
live floor first; db-6 taught us the code may not be a stub), then the PLAN → critique → preflight gate.
