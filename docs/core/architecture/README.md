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
| [information-architecture.md](information-architecture.md) | Navigation model (co-primary dual-axis: module dock + Spaces bar) and canonical module→nav placement; the experience-track root (UX-1) |
| [command-bar-and-search.md](command-bar-and-search.md) | The `⌘K` global launcher + search interaction model — two modes, frecency+pinning commands, provider seams, all search states; the experience-track surface (UX-2) |
| [shell-layout.md](shell-layout.md) | The shell frame layout + responsive model — 5 regions, breakpoints (375/768/1440/1920, applied from design.md §X), per-region reflow, density, layering; the experience-track layout (UX-3) |
| [state-conventions.md](state-conventions.md) | The interaction-state conventions every screen follows — the four terminal states (reused from the `@vida/core` canon), the React-Query-result→state derivation, per-state presentation (skeleton/empty/error/success), optimistic stance (none by default), and the keyboard model; the experience-track state layer (UX-4) |
| [onboarding.md](onboarding.md) | The first-run onboarding flow model — the 4-step model (welcome/privacy/vault/ready), the device-local first-run boundary contract (`first_run:completed` marker, distinct from `exists()` and from the synced user flag), the copy-honesty contract (M1.0 local-first vs M3 zero-knowledge), and the deferred crypto/auth seams (AR-3/UX-5b/M3); the experience-track front door (UX-5) |
| [module-dependency-graph.md](module-dependency-graph.md) | Which modules and foundation substrates depend on which, build order derivation, and risk points |
| [data-flow.md](data-flow.md) | How data moves through the system — write flow, read flow, encryption pass-through, service layer pattern, state management |
| [cross-module-integration.md](cross-module-integration.md) | Every point where one module accesses another's data — journal summary, entity links, task references, gamification, notifications |
| [platform-strategy.md](platform-strategy.md) | How web, mobile, and desktop share code — database adapters, editor strategy, visualization approach |
| [security-model.md](security-model.md) | Zero-knowledge encryption architecture — three-layer model, key hierarchy, SRP authentication, field classification |
| [performance-strategy.md](performance-strategy.md) | Performance targets and strategies — query optimization, rendering, memory management, long-term data handling |
