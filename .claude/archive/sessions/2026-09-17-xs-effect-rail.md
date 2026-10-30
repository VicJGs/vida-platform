# 2026-09-17 — xs-effect-rail #32 (LIF-170)

Task completed.

The effect-firing runtime over the AR-7 rail + AR-5 session contracts. Entity Re-scope (recovery/Ratify) flow:
delivery docs (interpretation → Documentation Gate → interpretation → Interpretation Gate → reconciliation dry-pass
→ Re-scope Gate) then 3 §XXVI-double-gated slices, each with a live-store Verification Gate:
- S1 XCU-10 `resolveTargets` (attachments.ts)
- S2 XCU-22 `assertEffectPermitted` handler-side consent gate (effects/gate.ts)
- S3 XCU-09 `transition` + `fireCompletionEffects` lifecycle engine (lifecycle.ts)

Gates caught: phantom deleted_at (S1); capability-vs-session category error (S2, §XXVIII); ended_at/Date.now()
non-determinism + cartesian over-fire (S3 gate-1); M1.0 encryptedFields:[] vault seam (S3 live gate). Two
doc-grounded course-corrections steered by Victor (fire-on-completion = SS-10; handler-side gate = §3.2.5-A3/BR-17).

839 @vida/core tests green · tsc 0 · lint clean. Currency docs refreshed (§XXIX). Commit `52c2f69` → PR #34
merged (`300b185`). LIF-170 → Done.
