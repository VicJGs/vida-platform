# Module Dependency Graph

This document specifies which modules depend on which other modules, classifies each dependency as hard or soft, identifies risk points, and provides the foundational information for planning implementation order.

**Audience:** Developers planning work across modules, or assessing the impact of a change to a module's API or data model.

**Governs:** No code directly. Governs the understanding of which modules are safe to change independently and which require coordinated changes.

---

## 1. Dependency Classification

Each dependency between modules is classified as:

| Type | Meaning | Example |
|------|---------|---------|
| **Hard** | Consumer module cannot function without provider. The consumer's core feature set requires data or services from the provider. | Tasks requires Notes & Pages — task notes are stored as pages |
| **Soft** | Consumer module is enhanced by provider but works without it. Removing the provider degrades the consumer but doesn't break it. | Journals reads from Habits for the daily summary — the journal still works without habits data |

---

## 2. The 17 Modules

Every module in the platform, listed by category.

### Foundational Modules

These modules are depended on by many others. Changes here have the widest impact.

| Module | Description |
|--------|-------------|
| **Notes & Pages** | The unifying layer — every module can create linked pages, entity links, and backlinks. The `pages` table is the integration hub. |
| **Preferences** | User settings (theme, locale, notifications, module toggles). Every module reads preferences for display and behavior configuration. |

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
| **Gamification** | XP, levels, achievements. Reads from all modules to detect accomplishments. |
| **Notifications** | Alerts from all modules. Reads user preferences to filter which notifications fire. |
| **Pomodoro** | Focus timer sessions. Links to any entity (task, note, study session) via polymorphic reference. |

---

## 3. Dependency Diagram

```
PERIPHERAL LAYER (depends on many, depended on by none)
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│   │ Gamification   │  │ Notifications  │  │   Pomodoro     │       │
│   │ (reads all)    │  │ (reads all)    │  │ (links to any) │       │
│   └───────┬────────┘  └───────┬────────┘  └───────┬────────┘       │
│           │ soft               │ soft               │ soft           │
└───────────┼────────────────────┼────────────────────┼────────────────┘
            │                    │                    │
            v                    v                    v
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
│   (via junction tables)                   Projects (via FKs)       │
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
| Gamification | Notes & Pages | Soft | XP history references page entities |
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
| Projects | Habits | Soft | Projects link to habits via `project_habits` junction table |
| Purposes & Goals | Habits | Soft | Purposes link to habits via `purpose_habits` junction table. Aggregated progress computed from linked habits. |
| Purposes & Goals | Routines | Soft | Purposes link to routines via `purpose_routines` junction table |
| Purposes & Goals | Projects | Soft | Purposes link to projects via `purpose_projects` junction table |
| Bucket List | Purposes & Goals | Soft | Bucket list items can link to a purpose via `purpose_id` FK |
| Bucket List | Projects | Soft | Bucket list items can link to a project via `project_id` FK |
| Languages | Learning | **Hard** | Languages share the study session infrastructure, spaced repetition system, and flashcard framework from Learning |
| Learning (Study Planner) | Learning (Courses/Books) | **Hard** | Scheduled study sessions reference courses, books, topics, flashcard decks via polymorphic FKs |

### Peripheral Module Dependencies

| Consumer | Provider | Type | Reason |
|----------|----------|------|--------|
| Gamification | Tasks | Soft | Awards XP on task completion (variable by difficulty) |
| Gamification | Habits | Soft | Awards XP on habit completion, streak milestones |
| Gamification | Routines | Soft | Awards XP on routine completion |
| Gamification | Learning | Soft | Awards XP on study session, course completion, flashcard mastery |
| Gamification | Finance | Soft | Awards XP on transaction logging |
| Gamification | Relationships | Soft | Awards XP on interaction logging |
| Gamification | Check-ins | Soft | Awards XP on check-in completion, streak milestones |
| Gamification | Pomodoro | Soft | Awards XP on focus session completion |
| Gamification | Bucket List | Soft | Awards XP on bucket list item completion |
| Notifications | Tasks | Soft | Generates due date reminders, overdue alerts |
| Notifications | Habits | Soft | Generates habit reminders, streak-at-risk warnings |
| Notifications | Relationships | Soft | Generates stay-in-touch reminders, birthday/anniversary alerts |
| Notifications | Learning | Soft | Generates study plan due date alerts |
| Notifications | Finance | Soft | Generates recurring transaction reminders |
| Notifications | Gamification | Soft | Generates achievement unlocked, level up alerts |
| Notifications | Check-ins | Soft | Generates check-in prompts (morning/evening) |
| Notifications | Pomodoro | Soft | Generates focus session complete, break over alerts |
| Pomodoro | Tasks | Soft | Timer can link to a task via entity_type/entity_id |
| Pomodoro | Notes & Pages | Soft | Timer can link to a note or class note |
| Pomodoro | Learning | Soft | Timer can link to a study session |

---

## 5. Dependency Counts

How many modules each module depends on (out-degree) and how many depend on it (in-degree).

### Modules Sorted by In-Degree (Most Depended On)

| Module | In-Degree | Depended On By |
|--------|-----------|---------------|
| **Notes & Pages** | 14 | All domain modules + Gamification + Pomodoro |
| **Preferences** | 14 | All modules (read settings) + Notifications (hard) |
| **Habits** | 6 | Journals, Routines, Projects, Purposes & Goals, Gamification, Notifications |
| **Tasks** | 6 | Journals, Projects, Routines, Gamification, Notifications, Pomodoro |
| **Projects** | 5 | Tasks, Purposes & Goals, Bucket List, Gamification, Notifications |
| **Routines** | 4 | Journals, Purposes & Goals, Gamification, Notifications |
| **Learning** | 5 | Journals, Tasks, Languages, Gamification, Notifications |
| **Finance** | 3 | Journals, Gamification, Notifications |
| **Relationships** | 3 | Journals, Tasks, Gamification, Notifications |
| **Gamification** | 1 | Notifications |
| **Check-ins** | 2 | Gamification, Notifications |
| **Purposes & Goals** | 1 | Bucket List |
| **Bucket List** | 1 | Gamification |
| **Pomodoro** | 2 | Gamification, Notifications |
| **Languages** | 1 | Gamification |
| **Journals** | 0 | (none) |
| **Notifications** | 0 | (none) |

### Modules Sorted by Out-Degree (Most Dependencies)

| Module | Out-Degree | Depends On |
|--------|------------|------------|
| **Gamification** | 10 | Tasks, Habits, Routines, Learning, Finance, Relationships, Check-ins, Pomodoro, Bucket List, Notes & Pages |
| **Notifications** | 10 | Tasks, Habits, Relationships, Learning, Finance, Gamification, Check-ins, Pomodoro, Preferences, Notes & Pages |
| **Journals** | 7 | Notes & Pages (hard), Habits, Tasks, Routines, Learning, Finance, Relationships |
| **Purposes & Goals** | 4 | Notes & Pages, Habits, Routines, Projects |
| **Tasks** | 5 | Notes & Pages (hard), Projects, Learning, Relationships, Preferences |
| **Bucket List** | 3 | Notes & Pages, Purposes & Goals, Projects |
| **Routines** | 3 | Notes & Pages, Habits, Tasks |
| **Projects** | 3 | Notes & Pages (hard), Tasks, Habits |
| **Languages** | 2 | Notes & Pages, Learning (hard) |
| **Learning** | 1 | Notes & Pages (hard) |
| **Pomodoro** | 3 | Tasks, Notes & Pages, Learning |
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

| Module | In-Degree | Hard Dependents | Assessment |
|--------|-----------|-----------------|------------|
| **Notes & Pages** | 14 | Journals, Tasks, Projects, Learning | **Highest risk.** Every module integrates through pages and entity links. Changes to the `pages` table schema, entity_links CHECK constraint, or backlink service affect the entire platform. |
| **Preferences** | 14 | Notifications | **High risk.** Every module reads preferences. Changes to preference keys or notification settings affect all modules' display behavior and notification dispatch. |

### Medium Risk

| Module | In-Degree | Assessment |
|--------|-----------|------------|
| **Habits** | 6 | Journals summary, Routines linking, Projects linking, Purposes aggregation, Gamification XP, Notifications. Changes to `habits` or `habit_completions` schema affect 6 consumers. |
| **Tasks** | 6 | Journals summary, Projects aggregation, Routines linking, Gamification XP, Notifications, Pomodoro linking. Changes to `tasks` schema affect 6 consumers. |
| **Projects** | 5 | Tasks FK, Purposes linking, Bucket List FK, Gamification, Notifications. Changes to `projects` or `milestones` schema affect 5 consumers. |
| **Learning** | 5 | Journals summary, Tasks FK, Languages (hard), Gamification, Notifications. The Languages module has a **hard dependency** — breaking Learning breaks Languages. |

### Low Risk

| Module | In-Degree | Assessment |
|--------|-----------|------------|
| **Routines** | 4 | Only soft dependents. Changes are isolated. |
| **Finance** | 3 | Only soft dependents (Journals summary, Gamification, Notifications). |
| **Relationships** | 3 | Only soft dependents. |
| **Check-ins** | 2 | Only Gamification and Notifications. |
| **Pomodoro** | 2 | Only Gamification and Notifications. |
| **Purposes & Goals** | 1 | Only Bucket List. |
| **Gamification** | 1 | Only Notifications. |
| **Bucket List** | 1 | Only Gamification. |
| **Languages** | 1 | Only Gamification. |
| **Journals** | 0 | No dependents — leaf module. |
| **Notifications** | 0 | No dependents — leaf module. |

### Key Takeaways

1. **Notes & Pages is the riskiest module.** It is the integration hub. Any schema change to `pages`, `entity_links`, or `page_links` requires auditing all 14 dependent modules.
2. **Preferences is silently pervasive.** Every module reads it, but the reads are simple key lookups. Risk is lower than Notes & Pages in practice.
3. **Learning → Languages is the only non-foundational hard dependency chain.** Breaking Learning breaks Languages.
4. **Peripheral modules (Gamification, Notifications, Pomodoro) have zero dependents.** They are safe to modify without affecting any other module.

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

- **ADR-002 section 8** — Cross-domain relationship map (FK relationships, junction tables, polymorphic references)
- **ADR-002 section 5.2** — Pages table with entity_type/entity_id polymorphic pattern
- `docs/core/architecture/cross-module-integration.md` — Detailed integration points, data freshness, and query patterns
- `packages/core/src/db/schema.ts` — All table definitions with FK constraints
