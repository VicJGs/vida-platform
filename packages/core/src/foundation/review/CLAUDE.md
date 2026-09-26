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
(BR-KN-S3-*). ⚠ Gotcha: `review_curves.params` is `json<T>()` → stringify-on-write / parse-on-read at the engine
boundary (the M1.0 repo does not auto-serialize non-encrypted values).
**Deferred here (S4+):** `getDue`/`dueIn` · `recordReview` (append `review_events`) · `deriveMastery` (COMPUTED,
never hand-set) · `rollupMastery` (via `foundation/measurement` free functions) · `seedPresetCurves` (SM-2 preset).
