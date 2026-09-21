# Task: xs-notifications-delivery
# Status: in-progress
# Linear: LIF-174
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Spec: docs/specs/foundation/xs-notifications-delivery/
# Source: decomposition.md (P3, 17 legs) + coverage-report.md (P4 SHIP) — backend-replan
# Created: 2026-09-21

## Goal
Build the ADR-013 zero-knowledge notification **delivery engine** (`foundation/notifications`) — the
three-tier delivery contract (in-app · local-scheduled OS alert · content-free wake-signal), the content-minimal
push payload contract, the per-channel ZK-fidelity invariants, and the metadata-bound honesty rule — as a pure
decision/routing tier + deny-safe/fail-closed ports, NO schema. XCU-01…12, 14–18 (17 legs; XCU-13 device-registry
columns are ADR-003/sync-owned, out of scope).

## Dependencies
- blocked by: — ZERO build deps (decomposition.md:47 blocked-hard/soft = —, —), READY.
- NO composed services: gate-1 corrected an early draft that made egress #43 a dep + routed transmit through
  assertEgressPermitted — WRONG (egress demands a user_action proof + gating is the dispatcher's, NF-5). The engine
  takes caller-supplied inputs (already-gated decision, ADR-012 effect_event_id, dueIn/quiet-hours) + deny-safe ports.
- consumed by (first-consumer-pull): MOD-notifications #53 (dispatcher/records) · MOD-sessions (dueIn) + 10 MOD feature modules

## Boundary (ADR-013 §3.6 — the delivery boundary)
OWNS: three-tier delivery contract · content-minimal push payload spec · per-channel ZK-fidelity rule
(in-app full · push wake-only · email generic · no-SMS) · wake-relay capability + metadata bound · opt-out mode.
Does NOT own: `notifications` records / dispatch / gating (MOD-notifications), *what/when* due (MOD-notifications +
Sessions `dueIn`), quiet-hours/channel *config* (Preferences §5.17), device registry (ADR-003).

## M1 vs M2 (deny-safe shape-class — mirrors xs-egress/ingestion/ai)
- **M1 (this build):** the pure delivery-DECISION engine — tier routing, channel matrix, payload contract,
  quiet-hours-baking / reschedule / idempotency / fallback / opt-out DERIVATIONS — + deny-safe/fail-closed PORTS
  for every real reach (OS local scheduler, server wake-relay push, web service-worker push, email nudge). NO schema.
- **M2/M4/build-phase:** real platform reach (Expo/Tauri/Web-Push/APNs/FCM), the Hono server wake-relay, email
  provider, + schema (delivery-audit columns on `notifications`, push-token columns on device registry, ADR-002 §5.20).

## Decomposition (Approval 1 — Entity Delivery Flow front matter)
See docs/specs/foundation/xs-notifications-delivery/delivery/{interpretation,slice-map,seam-contract}.md + service/_index.md.
3 backend slices, 0 FE (delivery is a mechanism; no user surface — P6 fe faces belong to MOD-notifications UI).

## Open Questions
- [to be filled as they arise]

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## Progress
- [x] Step 0 BASELINE — greenfield confirmed (reminder-engine.ts 0 bytes; foundation/notifications = dir home only); corpus read (ADR-013, xcut-notifications 17 legs, NF business-rules, decomposition.md); egress/effect-rail APIs read
- [x] Step 1 Interpretation layer — delivery/interpretation.md (gate-1 self-caught the egress mis-delegation)
- [x] Step 1.5 Envision Gate — N/A (pure backend, no user surface) — stated
- [x] Step 2 Decomposition Gate — slice-map + seam-contract + service/_index; critic REVISE→folded (B1/B2/N1/N3); **Approval 1 GRANTED 2026-09-21** + doc-alignment verified vs decomposition.md:47/93-107 (all 17 homed, XCU-13 excluded, XCU-12/14/16/17 engine-internal)
- [x] S1 — tier router · channel matrix · content-minimal payload contract (PURE). ✅ Verification Gate PASS: tsc 0, eslint 0, @vida/core 1143/1143 (+15). `types.ts`/`tiers.ts`/`payload.ts`/`index.ts` + barrel re-export. XCU-01/02/08/12/16(types). Fixed: `as unknown as` cast on the content-zero guard.
- [x] S2 — scheduling derivations (PURE). ✅ Gate PASS: tsc 0, eslint 0, 14 tests. `scheduling.ts` bakeQuietHours(shift/suppress/midnight-span)/reschedulePlan/dedupKey(N3 pass-through)/shouldMaterialize. XCU-04/05/14/18.
- [x] S3 — delivery dispatch: deny-safe ports · fallback→in-app · opt-out (PURE). ✅ Gate PASS: tsc 0, eslint 0, 9 tests. `types.ts`(S3)/`ports.ts`(deny-safe)/`service.ts` `createNotificationDeliveryEngine(ports?)`. XCU-02/03/06/07/09/10/11/15/16/17. no enforcer/egress (gating upstream).
- [x] tsc --noEmit 0 · eslint 0 · per-slice Verification Gate PASS (all PURE — no live-store; stated, DEL-9/10)
- [x] D6 + Currency Rule (§XXIX) — docs/core/notifications-delivery/current-{spec,business-rules}.md born; foundation/notifications/CLAUDE.md → BUILT
- [x] /critique pre-ship → independent critic REVISE→SHIP. B1 (deliver folds push/email failure to in-app, never rejects — BR-ND-8) + B2 (scheduleLocal registers under `dedupKey` namespace, not raw ts) + N1 (drop DeliverySuppressed from seam-doc) + N3 (return `at`) folded. Full @vida/core 1168/1168 (+40), tsc 0, eslint 0.
- [ ] PR → merge

## Build Steps
<!-- filled from the approved slice specs -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-09-21 | task init (stub→full, LIF-174); baseline + corpus read (ADR-013, xcut-notifications 17 legs, NF business-rules, decomposition.md) | author interpretation + decomposition → Approval 1 |

## Notes
Env: Node 24 via nvm + corepack pnpm. Per-issue branch `xs-notifications-delivery` → PR → merge (foreground).
