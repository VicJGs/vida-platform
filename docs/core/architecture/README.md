# Architecture

Architectural specifications for the Vida Platform — a zero-knowledge, local-first, multiplatform life management system.

## Overview

Vida is built on three layers. The **infrastructure layer** provides encryption, sync, database abstraction, and authentication — all user data is encrypted client-side and the server never sees plaintext. The **data modules layer** contains 17 domain modules (Tasks, Habits, Finance, Learning, Relationships, etc.) that each manage their own entities through a shared service and repository pattern. The **Notes & Journals layer** acts as the unifying interface — every module's data surfaces through a TipTap block editor with custom integration blocks, wiki-style entity linking, and a daily journal that aggregates activity across modules.

All business logic lives in `packages/core` and runs identically on web, mobile, and desktop. Each platform provides only a database adapter and platform-specific UI chrome. Data syncs between devices as encrypted blobs using field-level Last-Writer-Wins for structured data and Yjs CRDT for editor content.

## Relationship to ADRs

The architecture documents in this directory **interpret and organize** information from the ADRs in `docs/core/decisions/`. The ADRs are the canonical source of truth for technology choices (ADR-001), data model (ADR-002), and sync protocol (ADR-003). Architecture docs do not duplicate ADR content — they reference it and build on it to answer higher-level questions about how systems connect, how data flows, and what patterns developers should follow.

## Documents

| File | Purpose |
|------|---------|
| [system-overview.md](system-overview.md) | Highest-level description of the platform — modules, layers, platforms, and technology stack |
| [module-dependency-graph.md](module-dependency-graph.md) | Which modules depend on which, build order derivation, and risk points |
| [data-flow.md](data-flow.md) | How data moves through the system — write flow, read flow, encryption pass-through, service layer pattern, state management |
| [cross-module-integration.md](cross-module-integration.md) | Every point where one module accesses another's data — journal summary, entity links, task references, gamification, notifications |
| [platform-strategy.md](platform-strategy.md) | How web, mobile, and desktop share code — database adapters, editor strategy, visualization approach |
| [security-model.md](security-model.md) | Zero-knowledge encryption architecture — three-layer model, key hierarchy, SRP authentication, field classification |
| [performance-strategy.md](performance-strategy.md) | Performance targets and strategies — query optimization, rendering, memory management, long-term data handling |
