# Module Dependency Graph

This document specifies which modules and **foundation substrates** depend on which others, classifies each dependency as hard or soft, identifies risk points, and provides the foundational information for planning implementation order.

**Audience:** Developers planning work across modules, or assessing the impact of a change to a module's API or data model.

**Governs:** No code directly. Governs the understanding of which modules are safe to change independently and which require coordinated changes.

> **Implementation status (2026-07-25):** This document describes the platform's **target architecture** — the substrate
> model established by ADRs 004–017 + the capability framework. It is **not** a snapshot of shipped code: ~99% of current
> code predates this foundation (see `docs/specs/foundation/current-state-baseline/baseline.md`), the storage layer is being
> **rebuilt from zero** per-table (ADR-016), and Phase-1.0 is **features-first** with encryption/sync/auth **deferred to a
> later hardening pass** (ADR-017). Substrate primitives cite their **owning ADR** (conceptual home); their code/directory
> homes are decided in a later structural phase, not here.

---

## 1. Dependency Classification

Each dependency between modules is classified as:

| Type | Meaning | Example |
|------|---------|---------|
| **Hard** | Consumer module cannot function without provider. The consumer's core feature set requires data or services from the provider. | Tasks requires Notes & Pages — task notes are stored as pages |
| **Soft** | Consumer module is enhanced by provider but works without it. Removing the provider degrades the consumer but doesn't break it. | Journals reads from Habits for the daily summary — the journal still works without habits data |

---

## 2. Modules and Foundation Substrates

The platform is organized as **feature modules riding shared foundation substrates**. A substrate is a cross-cutting
primitive that many modules consume rather than each re-implementing — introduced by ADRs 004–015 and inventoried in
`docs/specs/foundation/capability-framework.md`. The old "17 flat modules" framing understated these: mechanisms that
were once duplicated per module (tags, sessions, progress, XP, views) are now single substrates with the widest blast
radius in the platform.

### Foundation Substrates

Depended on by nearly every module. Changes here have platform-wide impact. Each cites its **owning ADR** (conceptual
home only — code homes are a later structural phase).

| Substrate | Owning ADR | Role |
|-----------|-----------|------|
| **Notes & Pages** | ADR-002 §5.2 | The `pages` integration hub — every module's entities can have linked pages, entity links, and backlinks. |
| **Spaces & Tags** | ADR-006 | `spaces` foundation tier + `entity_tags` universal tagging above every module (open taggable-type registry). Supersedes `page_tags` / inline `*.tags`. |
| **Sessions** | ADR-004 | The `sessions` table-per-type supertype for all timed/scheduled activity (pomodoro, study, reading), governed by a 4-dimension Integration Contract with a shared effect catalogue + idempotency rail. Supersedes standalone `pomodoro_sessions` / `study_sessions`. |
| **Measurability & Contributions** | ADR-011 | Universal progress contract (`measurement_kind` × `binding_mode`, nullable-derive) + `contributions` weighted polymorphic rollup. Supersedes the `purpose_*` junction tables. |
| **Points Economy** | ADR-012 | Multi-currency economy on a rule→consequence engine; `grant_currency` effect + `consequence_ledger` derived balance. Supersedes `xp_history` / direct `awardXP`. |
| **Saved Views** | ADR-007 | One `views` primitive (filter × layout × grouping), Space-owned or global, over documented read APIs. |
| **Review Engine** | ADR-005 | Knowledge's generic review engine (`review_events` / `method_bindings` / `review_curves`); study methods are pluggable services. Supersedes bespoke `flashcard_*` / SM-2 tables. |
| **Capability Registry** | ADR-008 / ADR-010 | Open capability-block registry (a capability declares render targets; placement is the user's choice) under a declare→grant→enforce authoring-security envelope. Supersedes the closed `BlockType` union. |
| **Preferences** | ADR-002 | User settings (theme, locale, module toggles). Every module reads preferences for display and behavior. |

Two further substrates are **cross-cutting integration layers** rather than owned tables — **External Ingestion**
(ADR-014, device-mediated guard, server blind) and **AI/LLM** (ADR-015, on-device/agentic + cloud-via-user-key). They
are dependency surfaces for any module that imports data or invokes a model.

### Domain Modules

Core life management features. Each manages its own entities and may depend on other domain modules.

| Module | Description |
|--------|-------------|
| **Journals** | Daily journal with auto-generated summary block. One page per date. |
| **Tasks** | Task management with sub-tasks, time logging, and cross-module FK links. |
| **Habits** | Habit tracking with streaks, completions, and cue/reward patterns. |
| **Routines** | Daily routine actions with recurrence, linked to habits and tasks. |
| **Projects** | Project management with milestones, documents, and task aggregation. |
| **Finance** | Accounts, transactions, assets, liabilities, investments, income streams. |
| **Relationships** | Contact CRM with interactions, reminders, events, and stay-in-touch tracking. |
| **Learning** | Courses, books, study sessions, skills, ICS calendar sync. |
| **Languages** | Language learning with vocabulary, daily sessions, recordings, weekly plans. |
| **Purposes & Goals** | Life purposes, targets, metrics, dreams. Links to habits, routines, and projects. |
| **Check-ins** | Daily morning/evening check-ins with mood, energy, gratitude, reflection. |
| **Bucket List** | Life aspirations with categories, progress steps, and cost estimates. |

### Peripheral Modules

These modules observe or enhance other modules but are not depended on by them.

| Module | Description |
|--------|-------------|
| **Gamification** | The **Points Economy** substrate's user-facing surface — currencies, levels, achievements — driven by a rule→consequence engine that consumes effects on the shared rail (ADR-012). It does not poll modules for "XP events"; modules emit `grant_currency` effects and the engine derives balances from `consequence_ledger`. |
| **Notifications** | Alerts from all modules, delivered under **zero-knowledge** via three tiers — local-scheduled OS alerts, a content-free cross-device wake-signal, and in-app (ADR-013). The server never sees notification content. Per-category user control is a **local** filter. |

> **Pomodoro is no longer a peripheral module.** Focus timing is a **sub-type of the `sessions` supertype** (ADR-004) —
> it rides the shared session lifecycle, effect catalogue, and idempotency rail rather than owning a standalone
> `pomodoro_sessions` table with its own polymorphic reference. It appears in this graph only as a session sub-type.

---

## 3. Dependency Diagram

```
PERIPHERAL LAYER (depends on many, depended on by none)
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ┌────────────────┐  ┌────────────────┐                           │
│   │ Gamification   │  │ Notifications  │   (Pomodoro is a           │
│   │ (consumes the  │  │ (ZK 3-tier     │    `sessions` sub-type,    │
│   │  effect rail)  │  │  delivery)     │    not a peripheral module)│
│   └───────┬────────┘  └───────┬────────┘                           │
│           │ soft               │ soft                                │
└───────────┼────────────────────┼───────────────────────────────────┘
            │                    │
            v                    v
DOMAIN LAYER (soft reads from all domain modules)
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ┌──────────────┐         soft (summary reads)                     │
│   │   Journals   │─────────────────────────────────┐                │
│   └──────┬───────┘                                  │                │
│          │ soft          soft          soft          │ soft           │
│          v               v              v           v                │
│   ┌──────────┐    ┌──────────┐   ┌──────────┐ ┌──────────────┐    │
│   │  Habits  │    │  Tasks   │   │ Routines │ │   Finance    │    │
│   └──────────┘    └────┬─────┘   └────┬─────┘ └──────────────┘    │
│        ^               │ soft         │ soft                        │
│        │               v              v                              │
│   ┌────┴─────────────────────┐  ┌──────────┐                       │
│   │       Projects           │  │ Learning │                       │
│   └──────────────────────────┘  └────┬─────┘                       │
│                                      │ hard                         │
│                                      v                              │
│                               ┌────────────┐                       │
│                               │ Languages  │                       │
│                               └────────────┘                       │
│                                                                      │
│   ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │ Purposes & Goals │  │  Check-ins   │  │ Bucket List  │        │
│   └───────┬──────────┘  └──────────────┘  └──────┬───────┘        │
│           │ soft                                  │ soft            │
│           v                                       v                 │
│   Habits, Routines, Projects              Purposes & Goals,        │
│   (via `contributions`)                   Projects (via FKs)       │
│                                                                      │
│   ┌──────────────────┐                                              │
│   │  Relationships   │                                              │
│   └──────────────────┘                                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
            │                    │
            v                    v
FOUNDATIONAL LAYER (depended on by most modules)
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ┌──────────────────────┐        ┌──────────────────────┐         │
│   │   Notes & Pages      │        │    Preferences       │         │
│   │   (pages, entity     │        │    (user settings,   │         │
│   │    links, tags)      │        │     module toggles)  │         │
│   └──────────────────────┘        └──────────────────────┘         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Complete Dependency Table

Every module-to-module dependency in the platform.

### Foundational Module Dependencies

| Consumer | Provider | Type | Reason |
|----------|----------|------|--------|
| Journals | Notes & Pages | **Hard** | Journals are pages (type='journal' in `pages` table) |
| Tasks | Notes & Pages | **Hard** | Task notes are pages (type='task_note'). Entity links connect tasks to notes. |
| Habits | Notes & Pages | Soft | Habit completions can have linked pages via entity_type/entity_id |
| Routines | Notes & Pages | Soft | Routine actions can have linked pages |
| Projects | Notes & Pages | **Hard** | Milestone notes and deliverable notes are pages |
| Finance | Notes & Pages | Soft | Financial entities can have linked pages |
| Relationships | Notes & Pages | Soft | Contacts can have linked pages |
| Learning | Notes & Pages | **Hard** | Class notes are pages (type='class_note'). Knowledge notes link to pages. |
| Languages | Notes & Pages | Soft | Language entities can have linked pages |
| Purposes & Goals | Notes & Pages | Soft | Purposes and targets can have linked pages |
| Check-ins | Notes & Pages | Soft | Check-ins can have linked pages |
| Bucket List | Notes & Pages | Soft | Bucket list items can have linked pages |
| Gamification | Notes & Pages | Soft | Consequence-ledger entries can reference page entities |
| Notifications | Preferences | **Hard** | Notification dispatch reads user preferences to check opt-in/opt-out and quiet hours |
| All modules | Preferences | Soft | Every module reads preferences for display settings, date format, currency, etc. |

### Domain Module Dependencies

| Consumer | Provider | Type | Reason |
|----------|----------|------|--------|
| Journals | Habits | Soft | Daily summary reads habit completions for the date |
| Journals | Tasks | Soft | Daily summary reads tasks due/completed on the date |
| Journals | Routines | Soft | Daily summary reads routine completions for the date |
| Journals | Learning | Soft | Daily summary reads study sessions for the date |
| Journals | Finance | Soft | Daily summary reads transactions for the date |
| Journals | Relationships | Soft | Daily summary reads interactions for the date |
| Tasks | Projects | Soft | Tasks can belong to a project via `project_id` FK. Tasks work without projects. |
| Tasks | Projects (Milestones) | Soft | Tasks can belong to a milestone via `milestone_id` FK |
| Tasks | Learning | Soft | Tasks can be linked to a course via `course_id` FK |
| Tasks | Relationships | Soft | Tasks can be linked to a contact via `contact_id` FK |
| Routines | Habits | Soft | Routine actions can link to a habit via `linked_habit_id` FK |
| Routines | Tasks | Soft | Routine actions can link to a task via `linked_task_id` FK |
| Projects | Tasks | Soft | Projects aggregate tasks and display progress from them |
| Projects | Habits | Soft | Projects link to habits via the `project_habits` junction table (kept — a project-scoped tracking link, distinct from the retired `purpose_*` trio) |
| Purposes & Goals | Habits | Soft | Habits contribute to a purpose via `contributions` (weighted, polymorphic). Aggregated progress derived through the measurability rollup (ADR-011 M4/M7). |
| Purposes & Goals | Routines | Soft | Routines contribute to a purpose via `contributions` |
| Purposes & Goals | Projects | Soft | Projects contribute to a purpose via `contributions` |
| Bucket List | Purposes & Goals | Soft | Bucket list items can link to a purpose via `purpose_id` FK |
| Bucket List | Projects | Soft | Bucket list items can link to a project via `project_id` FK |
| Languages | Learning | **Hard** | Languages share the `sessions` supertype (ADR-004) and the generic **review engine** (ADR-005) that Knowledge/Learning own — not a bespoke flashcard framework |
| Learning (Study Planner) | Learning (Courses/Books) | **Hard** | Scheduled study sessions reference courses, books, topics, and **review-engine** decks via polymorphic FKs |

### Peripheral Module Dependencies

Gamification does not poll these modules. Each module **emits `grant_currency` (and related) effects on the shared
effect rail** (ADR-012 E2); the consequence engine consumes them and derives balances/achievements from
`consequence_ledger` — applied exactly once via the idempotency rail (framework R1). The dependency is on the **rail**,
not on each module's internals.

| Consumer | Provider | Type | Reason |
|----------|----------|------|--------|
| Gamification | Tasks | Soft | Task completion emits a `grant_currency` effect (amount varies by difficulty) |
| Gamification | Habits | Soft | Habit completion / streak milestones emit `grant_currency` effects |
| Gamification | Routines | Soft | Routine completion emits a `grant_currency` effect |
| Gamification | Learning | Soft | Study-session completion, course completion, and **review-engine** mastery emit effects |
| Gamification | Finance | Soft | Transaction logging emits a `grant_currency` effect |
| Gamification | Relationships | Soft | Interaction logging emits a `grant_currency` effect |
| Gamification | Check-ins | Soft | Check-in completion / streak milestones emit effects |
| Gamification | Sessions | Soft | Focus/study **session** completion emits a `grant_currency` effect (ADR-004 `award_xp` catalogue member → generalized by ADR-012) |
| Gamification | Bucket List | Soft | Bucket-list completion emits a `grant_currency` effect |
| Notifications | Tasks | Soft | Due-date reminders, overdue alerts (local-scheduled tier) |
| Notifications | Habits | Soft | Habit reminders, streak-at-risk warnings |
| Notifications | Relationships | Soft | Stay-in-touch reminders, birthday/anniversary alerts |
| Notifications | Learning | Soft | Study-plan due-date alerts |
| Notifications | Finance | Soft | Recurring transaction reminders |
| Notifications | Gamification | Soft | Achievement-unlocked / level-up alerts |
| Notifications | Check-ins | Soft | Check-in prompts (morning/evening) |
| Notifications | Sessions | Soft | Focus/study-session complete, break-over alerts |

---

## 5. Dependency Counts

How many modules each module depends on (out-degree) and how many depend on it (in-degree).

> **Granularity note.** The counts below are at the **feature-module** level and remain useful for reasoning about
> module coupling. The **foundation substrates** (§2) are the true highest-in-degree centers of the platform — Spaces &
> Tags, Sessions, Measurability/Contributions, and the Points Economy are each consumed by nearly every module. Precise
> substrate in-degree counts depend on the per-table schema rebuild (ADR-016 / DB-11) and are not asserted here.
> "Pomodoro" no longer appears as a module — it is a `sessions` sub-type; its former dependents now depend on the
> **Sessions** substrate.

### Modules Sorted by In-Degree (Most Depended On)

| Module | In-Degree | Depended On By |
|--------|-----------|---------------|
| **Notes & Pages** | 14 | All domain modules + Gamification + Sessions |
| **Preferences** | 14 | All modules (read settings) + Notifications (hard) |
| **Habits** | 6 | Journals, Routines, Projects, Purposes & Goals, Gamification, Notifications |
| **Tasks** | 6 | Journals, Projects, Routines, Gamification, Notifications, Sessions |
| **Projects** | 5 | Tasks, Purposes & Goals, Bucket List, Gamification, Notifications |
| **Routines** | 4 | Journals, Purposes & Goals, Gamification, Notifications |
| **Learning** | 5 | Journals, Tasks, Languages, Gamification, Notifications |
| **Finance** | 3 | Journals, Gamification, Notifications |
| **Relationships** | 3 | Journals, Tasks, Gamification, Notifications |
| **Gamification** | 1 | Notifications |
| **Check-ins** | 2 | Gamification, Notifications |
| **Purposes & Goals** | 1 | Bucket List |
| **Bucket List** | 1 | Gamification |
| **Sessions** (substrate) | high | Gamification, Notifications, Tasks, Learning, Books, Habits — most timed activity (precise count → schema rebuild) |
| **Languages** | 1 | Gamification |
| **Journals** | 0 | (none) |
| **Notifications** | 0 | (none) |

### Modules Sorted by Out-Degree (Most Dependencies)

| Module | Out-Degree | Depends On |
|--------|------------|------------|
| **Gamification** | 10 | Tasks, Habits, Routines, Learning, Finance, Relationships, Check-ins, Sessions, Bucket List, Notes & Pages |
| **Notifications** | 10 | Tasks, Habits, Relationships, Learning, Finance, Gamification, Check-ins, Sessions, Preferences, Notes & Pages |
| **Journals** | 7 | Notes & Pages (hard), Habits, Tasks, Routines, Learning, Finance, Relationships |
| **Purposes & Goals** | 4 | Notes & Pages, Habits, Routines, Projects |
| **Tasks** | 5 | Notes & Pages (hard), Projects, Learning, Relationships, Preferences |
| **Bucket List** | 3 | Notes & Pages, Purposes & Goals, Projects |
| **Routines** | 3 | Notes & Pages, Habits, Tasks |
| **Projects** | 3 | Notes & Pages (hard), Tasks, Habits |
| **Languages** | 2 | Notes & Pages, Learning (hard) |
| **Learning** | 1 | Notes & Pages (hard) |
| **Sessions** (substrate) | — | A sub-type links to its subject (task, note, study resource); consumes Spaces, the effect rail, and the economy |
| **Habits** | 1 | Notes & Pages |
| **Finance** | 1 | Notes & Pages |
| **Relationships** | 1 | Notes & Pages |
| **Check-ins** | 1 | Notes & Pages |
| **Preferences** | 0 | (none) |
| **Notes & Pages** | 0 | (none — foundational) |

---

## 6. Risk Points

Modules ranked by blast radius — how many other modules would be affected by a breaking change.

### High Risk

| Module / Substrate | In-Degree | Hard Dependents | Assessment |
|--------|-----------|-----------------|------------|
| **Foundation substrates** | platform-wide | — | **Highest risk.** Spaces & Tags (`entity_tags`), Sessions, Measurability/`contributions`, and the Points Economy (`consequence_ledger`) are consumed by nearly every module. A change to a substrate's contract ripples across the platform — the reason they are single substrates (changed once) rather than per-module duplications. |
| **Notes & Pages** | 14 | Journals, Tasks, Projects, Learning | **Highest feature-level risk.** Every module integrates through pages and entity links. Changes to the `pages` schema, the entity-link **registry** (an open taggable/linkable registry, ADR-006 — not a closed CHECK set), or the backlink service affect the entire platform. |
| **Preferences** | 14 | Notifications | **High risk.** Every module reads preferences. Changes to preference keys or notification settings affect all modules' display behavior and notification dispatch. |

### Medium Risk

| Module | In-Degree | Assessment |
|--------|-----------|------------|
| **Habits** | 6 | Journals summary, Routines linking, Projects linking, Purposes aggregation (`contributions`), Gamification (effect rail), Notifications. Changes to `habits` or `habit_completions` schema affect 6 consumers. |
| **Tasks** | 6 | Journals summary, Projects aggregation, Routines linking, Gamification (effect rail), Notifications, Sessions linking. Changes to `tasks` schema affect 6 consumers. |
| **Projects** | 5 | Tasks FK, Purposes linking, Bucket List FK, Gamification, Notifications. Changes to `projects` or `milestones` schema affect 5 consumers. |
| **Learning** | 5 | Journals summary, Tasks FK, Languages (hard), Gamification, Notifications. The Languages module has a **hard dependency** — breaking Learning breaks Languages. |

### Low Risk

| Module | In-Degree | Assessment |
|--------|-----------|------------|
| **Routines** | 4 | Only soft dependents. Changes are isolated. |
| **Finance** | 3 | Only soft dependents (Journals summary, Gamification, Notifications). |
| **Relationships** | 3 | Only soft dependents. |
| **Check-ins** | 2 | Only Gamification and Notifications. |
| **Purposes & Goals** | 1 | Only Bucket List. |
| **Gamification** | 1 | Only Notifications. |
| **Bucket List** | 1 | Only Gamification. |
| **Languages** | 1 | Only Gamification. |
| **Journals** | 0 | No dependents — leaf module. |
| **Notifications** | 0 | No dependents — leaf module. |

### Key Takeaways

1. **The foundation substrates carry the widest blast radius.** Spaces & Tags (`entity_tags`), Sessions, Measurability/`contributions`, and the Points Economy (`consequence_ledger`) are each consumed by nearly every module — a change to any of them ripples platform-wide. Among the feature-level modules, **Notes & Pages** remains the riskiest hub (`pages`, `entity_links`, `page_links`).
2. **Preferences is silently pervasive.** Every module reads it, but the reads are simple key lookups. Risk is lower than the substrates or Notes & Pages in practice.
3. **Learning → Languages is the only non-foundational hard dependency chain.** Breaking Learning breaks Languages (they share the `sessions` supertype and the review engine).
4. **Peripheral modules (Gamification, Notifications) have zero dependents.** They consume the effect rail / deliver notifications but are depended on by no module, so they are safe to modify in isolation.

---

## 7. Independent Modules

Modules with few or no cross-module dependencies that can be developed and tested in isolation.

| Module | Dependencies | Notes |
|--------|-------------|-------|
| **Notes & Pages** | None | Foundational. Must be built first. |
| **Preferences** | None | Foundational. Must be built first. |
| **Habits** | Notes & Pages (soft) | Works standalone. Enhanced by page linking. |
| **Finance** | Notes & Pages (soft) | Fully independent domain. No FK references to other domain modules. |
| **Relationships** | Notes & Pages (soft) | Fully independent domain. |
| **Check-ins** | Notes & Pages (soft) | Fully independent domain. |

These modules can be developed in any order after the foundational modules are in place.

---

## References

- **`docs/specs/foundation/capability-framework.md`** — The foundation substrates (Sessions, Spaces, Measurability, Economy, Views, Review-engine, Capability-registry) with their mechanical predicates and owning ADRs
- **ADR-004 … ADR-015** — The substrate frameworks (sessions, review engine, spaces/tags, views, capability registry, templates, measurability, economy, notifications, ingestion, AI)
- **ADR-002 section 8** — Cross-domain relationship map (FK relationships, `contributions`, polymorphic references)
- **ADR-002 section 5.2** — Pages table with entity_type/entity_id polymorphic pattern
- **ADR-016** — Storage rebuilt from zero; the per-table `schema/` is authored during the build phase (no consolidated `schema.ts` monolith is the source of truth)
- `docs/core/architecture/cross-module-integration.md` — Detailed integration points, data freshness, and query patterns
