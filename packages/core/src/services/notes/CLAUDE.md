# services/notes — per-module business logic
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this module is
The pages integration hub — linked pages, entity links, backlinks across every module

## Owning ADR / context
ADR-002 §5.2 (notes-and-pages)

## Pattern
Follows the service data-flow pattern GOVERNED by docs/core/architecture/data-flow.md
(validate -> repository -> encrypt-seam -> return). Rides foundation/ substrates; does not re-implement them.

## Status
Directory home only (ADR-018). Service logic is authored PER-FEATURE at build phase (ADR-017).
Types + Zod live in @vida/types. No feature code lives here yet.
