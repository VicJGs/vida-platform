# Architecture

Architectural specifications for the Vida Platform — a zero-knowledge, local-first, multiplatform life management system.

## Overview

Vida is built in layers. The **infrastructure layer** provides encryption, sync, database abstraction, and authentication —
all user data is encrypted client-side and the server never sees plaintext. Above it sits a **foundation-substrate tier** —
cross-cutting primitives (Spaces & Tags, Sessions, Measurability, Points Economy, Views, Review-engine, Capability-registry;
ADRs 004–012) that the feature modules consume rather than each re-implementing. The **feature-modules layer** holds the
user-facing domains (Tasks, Habits, Finance, Learning, Relationships, …), each managing its own entities through a shared
service and repository pattern while riding the substrates. The **Notes & Journals layer** is the unifying interface —
every module's data surfaces through a TipTap block editor with an open **capability-block registry** (ADR-008), wiki-style
entity linking, and a daily journal that aggregates activity across modules.

All business logic lives in `packages/core` and runs identically on web, mobile, and desktop. Each platform provides only a
database adapter and platform-specific UI chrome. Data syncs between devices as encrypted blobs using field-level
Last-Writer-Wins for structured data and Yjs CRDT for editor content — **on the deferred hardening pass** (ADR-017:
Phase-1.0 is features-first, with encryption/sync/auth added later).

## Relationship to ADRs

The architecture documents in this directory **interpret and organize** information from the ADRs in
`docs/core/decisions/`. **ADRs 001–017 + `docs/specs/foundation/capability-framework.md` are the canonical foundation** —
technology stack (001), data model (002), sync (003), the substrate frameworks (004–015: sessions, review engine,
spaces/tags, saved views, capability registry, templates, capability-authoring security, measurability, economy,
notifications, external ingestion, AI), storage rebuild (016), and features-first resequencing (017). Architecture docs do
not duplicate ADR content — they reference it and build on it to answer higher-level questions about how systems connect,
how data flows, and what patterns developers should follow. Where a doc and an ADR disagree, **the ADR governs.**

## Documents

| File | Purpose |
|------|---------|
| [system-overview.md](system-overview.md) | Highest-level description of the platform — modules, layers, platforms, and technology stack |
| [module-dependency-graph.md](module-dependency-graph.md) | Which modules and foundation substrates depend on which, build order derivation, and risk points |
| [data-flow.md](data-flow.md) | How data moves through the system — write flow, read flow, encryption pass-through, service layer pattern, state management |
| [cross-module-integration.md](cross-module-integration.md) | Every point where one module accesses another's data — journal summary, entity links, task references, gamification, notifications |
| [platform-strategy.md](platform-strategy.md) | How web, mobile, and desktop share code — database adapters, editor strategy, visualization approach |
| [security-model.md](security-model.md) | Zero-knowledge encryption architecture — three-layer model, key hierarchy, SRP authentication, field classification |
| [performance-strategy.md](performance-strategy.md) | Performance targets and strategies — query optimization, rendering, memory management, long-term data handling |
