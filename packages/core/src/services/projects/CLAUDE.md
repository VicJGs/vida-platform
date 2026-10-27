# services/projects — per-module business logic

# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this module is

Projects, milestones, documents, task aggregation; measurement + contributions

## Owning ADR / context

projects context

## Pattern

Follows the service data-flow pattern GOVERNED by docs/core/architecture/data-flow.md
(validate -> repository -> encrypt-seam -> return). Rides foundation/ substrates; does not re-implement them.

## Status

Directory home only (ADR-018). Service logic is authored PER-FEATURE at build phase (ADR-017).
Types + Zod live in @vida/types. No feature code lives here yet.
