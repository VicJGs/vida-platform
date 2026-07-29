# foundation/spaces — substrate (ADR-006)
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this substrate is
Spaces foundation tier + entity_tags universal tagging above every module + open taggable-type registry (MERGE: OpenRegistry #13)

## Owning ADR
ADR-006

## Capabilities (framework §3)
SP1 SP2 SP3 SP4 SP5 SP6 SP7

## Status
Built by AR-6 (2026-07-29). `tags` · `entity_tags` · `entity_links` · `spaces` · `space_enabled_blocks`
(schema/foundation/spaces.ts + migration 003) + `TaggableTypeRegistry` (SP2) + `SpacesService`
(idempotent junction writes BR-14; resolve-then-soft-delete BR-15; M1.0 empty-[E] pass-through BR-13).
Views live in `foundation/views` (ADR-007). Deferred: capability registry / block_instances (AR-7),
effect rail (AR-7), resolution-surface + predicate-DSL + layout specs (build-time).
