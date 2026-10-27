# foundation/review — substrate (ADR-005)

# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this substrate is

Generic review engine (review_events / method_bindings / review_curves); study methods are pluggable services; mastery-derived

## Owning ADR

ADR-005

## Capabilities (framework §3)

SM1 SM2 SM3 SM4

## Status

Engine ① BUILT by mod-knowledge #50 ① S3 (2026-09-26): `createReviewEngine(db, deviceId, { capability })` —
methods (the `kind='study_method'` partition of the ONE capability registry, ADR-008 — not a parallel store),
curves (`review_curves`, personalizable; SM-2 = one preset, seed deferred to S4), bindings (`method_bindings`,
polymorphic, no-FK refs not asserted), + a 2-tier `resolveDefaultMethod` (`default_method_id` else null; the
realm→method tier is an S7 forward seam). No schema authored (`008_knowledge_review` already shipped).
Home per D1 (`docs/modules/knowledge/delivery/decomposition.md:11-19`) — the engine is Knowledge-owned but lives
here because it is cross-consumed (flashcards S7 + future skills/languages/education). `createKnowledgeService`
composes it as the required `review` dep. Spec/rules: `docs/modules/knowledge/current-{spec,business-rules}.md`
(BR-KN-S3-\*). ⚠ Gotcha: `review_curves.params` is `json<T>()` → stringify-on-write / parse-on-read at the engine
boundary (the M1.0 repo does not auto-serialize non-encrypted values).
Engine ② BUILT by S4 (2026-09-27): `recordReview` (append-only `review_events`; no mastery write — derive-on-read),
`getDue`/`dueIn` (due-queue from events + bound review-curve interval; unbound/never-reviewed ⇒ due now),
`deriveMastery` (0–100 or null via `foundation/measurement.normalize` on the latest non-null quality — generic on
`object_id`, NEVER reads knowledge_objects). Composes the pure `foundation/measurement` free functions by import
(first service consumer). `rollupMastery` is NOT here — it walks `knowledge_objects.parent_object_id`, so it lives in
`services/knowledge` (composing `measurement.rollup`). Mastery = derive-on-read, never stored, never a formula (KN-9
"tune the curve, not the number"). ⚠ `DueItem` name is owned by `services/sessions` → this module exports
`ReviewDueItem`. **Deferred here (S5+):** `seedPresetCurves` (SM-2 preset) · non-linear decay/interval curves
(ADR-011:76 build-phase) · `getMasterySource` 3-signal Education seam (S5, measurement source-registry) · event
fan-out (`review.recorded`/`mastery.changed`, S8).
