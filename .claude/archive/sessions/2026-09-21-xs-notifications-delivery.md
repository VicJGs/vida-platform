Date: 2026-09-21 — xs-notifications-delivery #46 (LIF-174) — M1.1.2 head — BUILD (Entity Delivery Flow)
Task: xs-notifications-delivery · Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow v1) · branch xs-notifications-delivery

Goal: build the ADR-013 zero-knowledge notification DELIVERY engine (foundation/notifications-delivery) — 17 legs
(XCU-01…12, 14–18), pure decision/routing tier + deny-safe/fail-closed ports, NO schema. XCU-13 (device-registry
columns) is ADR-003/sync-owned, out of scope. The LAST M1.1.2 XS security service.

Starting from scratch (greenfield — reminder-engine.ts = 0 bytes; server has no notification route).
Front matter: baseline → interpretation → decomposition (Approval 1) → per-slice build.

---
## ✅ COMPLETE (2026-09-21) — ① backend DONE (3 slices) → PR #63 merged → LIF-174 Done
Accomplished:
  - `packages/core/src/foundation/notifications/` — the ADR-013 ZK delivery engine, 17 legs (XCU-01…12,14-18):
    S1 tiers/channels/payload · S2 scheduling derivations · S3 `createNotificationDeliveryEngine(ports?)` deny-safe dispatch.
  - Pure decision/routing tier + deny-safe/fail-closed ports, NO schema. Gating upstream (dispatcher, NF-5) — no enforcer/egress.
  - Full Entity Delivery Flow: Approval 1 (independent critic REVISE→folded the egress mis-delegation; doc-alignment verified vs decomposition.md:47/93-107) → per-slice Verification Gates (all pure) → pre-ship /critique REVISE→SHIP (B1 deliver-never-rejects · B2 dedup-key namespace · N1/N3).
  - @vida/core 1168/1168 (+40), tsc 0, eslint 0. Currency docs/core/notifications-delivery/current-* born. PR #63 (`30db0a9`).
Decisions:
  - The deny-safe shape-class generalizes, but egress-delegation does NOT: a content-free notification push is not an egress-guard act (egress needs a user_action proof; gating is the dispatcher's, NF-5; zero build deps per decomposition.md:47). Engine holds no enforcer/egress.
  - All slices pure → no live-store gate (no DB/schema at M1) — stated honestly, not faked.
  - Memory: [[xs-security-services-deny-safe-port-build-shape]] extended (notification-delivery-is-not-egress; the triad's egress-delegation is not a blanket rule).
Next session:
  - **FIRST ACTION:** M1.1.2 backend XS wave COMPLETE (#42-46 all Done). Next `#`-order head = **#47 MOD-finance** (the first MOD feature build; ← MOD-{journals,notes,sessions} + XS-×8, all Done — verify ready at pickup). Env: Node 24 via nvm; per-issue branch → PR → merge foreground.
