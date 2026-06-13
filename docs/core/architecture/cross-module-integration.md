# Cross-Module Integration

This document catalogs every point where one module accesses another module's data. It specifies the consuming module, providing module, data exchanged, direction, trigger, and freshness requirement for each integration.

**Audience:** Developers implementing service methods, state management hooks, or editor blocks that cross module boundaries.

**Governs:** All integration features — specifically `packages/core/src/services/journal-service.ts` (daily summary), `packages/core/src/services/backlink-service.ts` (entity links), and all cross-module query patterns.

---

## 1. Integration Points Table

Every cross-module data access in the platform. Freshness is either **reactive** (UI auto-updates when source data changes via React Query invalidation) or **on-demand** (fetched when the user navigates to the view).

| Consuming Module | Providing Module | Data Exchanged | Direction | Trigger | Freshness |
|------------------|-----------------|----------------|-----------|---------|-----------|
| Journals | Habits | Habit completions for a given date | Read | Journal daily summary render | Reactive |
| Journals | Tasks | Tasks completed or due on a given date | Read | Journal daily summary render | Reactive |
| Journals | Routines | Routine completions for a given date | Read | Journal daily summary render | Reactive |
| Journals | Learning | Study sessions started on a given date | Read | Journal daily summary render | Reactive |
| Journals | Finance | Transactions on a given date | Read | Journal daily summary render | Reactive |
| Journals | Relationships | Interactions logged on a given date | Read | Journal daily summary render | Reactive |
| Notes & Pages | All modules | Any entity via `entity_type`/`entity_id` on `pages` | Read | Page creation linked to an entity | On-demand |
| Notes & Pages | Notes & Pages | Page-to-page links via `page_links` | Read | `[[wiki-link]]` resolution | On-demand |
| Notes & Pages | All modules | Entity backlinks via `entity_links` | Read | Backlink panel render | On-demand |
| Tasks | Projects | Project name and status | Read | Task detail view | On-demand |
| Tasks | Projects | Milestone name and status | Read | Task detail view | On-demand |
| Tasks | Learning | Course name and status | Read | Task detail view | On-demand |
| Tasks | Relationships | Contact name | Read | Task detail view | On-demand |
| Purposes & Goals | Habits | Habit completion rates and streaks | Read | Purpose detail view | On-demand |
| Purposes & Goals | Routines | Routine completion rates | Read | Purpose detail view | On-demand |
| Purposes & Goals | Projects | Project progress percentage | Read | Purpose detail view | On-demand |
| Projects | Habits | Linked habit status via `project_habits` | Read | Project detail view | On-demand |
| Projects | Tasks | Tasks belonging to project | Read | Project detail/milestone view | On-demand |
| Learning | Learning | Scheduled study sessions for a resource | Read | Course/book/topic detail view | On-demand |
| Learning | Learning | Flashcard deck linked to a resource | Read | Course/topic detail view | On-demand |
| Learning | Learning | Skills linked via `skill_resources` | Read | Course/book detail view | On-demand |
| Pomodoro | All modules | Entity reference via `entity_type`/`entity_id` | Read | Timer start (links to task, note, study session) | On-demand |
| Gamification | All modules | Action events (completions, streaks, milestones) | Read | Per-module service emits XP event | On-demand |
| Notifications | Tasks | Due date reminders | Read | Scheduled check | On-demand |
| Notifications | Habits | Habit reminders, streak-at-risk warnings | Read | Scheduled check | On-demand |
| Notifications | Relationships | Stay-in-touch reminders | Read | Scheduled check | On-demand |
| Notifications | Learning | Study plan due dates | Read | Scheduled check | On-demand |
| Notifications | Finance | Recurring transaction reminders | Read | Scheduled check | On-demand |
| Notifications | Gamification | Achievement unlocked, level up | Read | XP award event | On-demand |
| Notifications | Check-ins | Check-in prompt (morning/evening) | Read | Scheduled check | On-demand |
| Notifications | Preferences | User notification opt-in/opt-out settings | Read | Before any notification dispatch | On-demand |
| Preferences | All modules | Module enable/disable flags | Write | User toggles module in settings | On-demand |

---

## 2. Journal Summary Integrations

The journal daily summary block (`/summary`) aggregates data from exactly **six modules**. The summary is a read-only view — it does not write back to any providing module.

### Providing Modules

| Module | Data Read | Query Pattern | Tables |
|--------|----------|---------------|--------|
| **Habits** | Completions for the journal date: habit name, completed count, target count | `habit_completions` JOIN `habits` WHERE `completed_date = ?` | `habits`, `habit_completions` |
| **Tasks** | Tasks completed or due on the date: title, status, priority | `tasks` WHERE `due_date = ?` OR completed on date | `tasks` |
| **Routines** | Routine completions for the date: action title, completed/skipped, duration | `routine_completions` JOIN `routine_actions` WHERE `completed_date = ?` | `routine_actions`, `routine_completions` |
| **Learning** | Study sessions started on the date: resource name, duration, focus rating | `study_sessions` WHERE date(`started_at`) = ? | `study_sessions`, `courses`, `books` |
| **Finance** | Transactions on the date: description, amount, category | `transactions` WHERE `date = ?` | `transactions` |
| **Relationships** | Interactions on the date: contact name, type, summary | `interactions` JOIN `contacts` WHERE `date = ?` | `interactions`, `contacts` |

### Freshness: Reactive

The journal summary uses **reactive data freshness**. When any of the six providing modules writes data for the current journal date, the journal summary automatically refreshes.

**Implementation:** Each providing module's mutation hooks invalidate the journal summary React Query cache key (`['journal-summary', journalDate]`). The summary re-fetches from local SQLite on invalidation.

### Configuration

The user configures which sections appear in their journal summary via the `summary_config` field on the `pages` table (encrypted JSON). The `DailySummaryBlockAttrs` type in `packages/types/src/editor.ts` defines the available sections.

**Code governance:**
- `packages/core/src/services/journal-service.ts` — Summary generation logic
- `packages/editor/src/extensions/daily-summary.ts` — Editor block rendering

---

## 3. Notes and Pages as Integration Layer

The Notes & Pages module is the **unifying layer** of the platform. Every other module's entities can be referenced from notes, and notes can be linked to any entity. This is the most pervasive integration in the system.

### 3.1 Entity-Linked Pages (`pages` Table)

Any module entity can have one or more linked pages via the polymorphic `entity_type`/`entity_id` columns on the `pages` table.

```
Entity (e.g., Task) ──1:N──> pages (entity_type='task', entity_id=task.id)
```

**Page types and their entity associations:**

| Page Type | Entity Type | Description |
|-----------|------------|-------------|
| `task_note` | `task` | A note linked to a specific task |
| `task_group_note` | (multiple tasks) | A note for a grouped task session |
| `class_note` | `course` | A note linked to a class/lecture |
| `milestone_note` | `milestone` | A note linked to a project milestone |
| `deliverable_note` | `milestone` | A sub-note for a milestone deliverable |
| `journal` | (none — uses `journal_date`) | Daily journal, one per date |
| `note` | (any or none) | General-purpose note, optionally linked |

**Query pattern:**
```sql
-- Find all notes for a task:
SELECT * FROM pages WHERE entity_type = 'task' AND entity_id = ?;

-- Find all notes for a habit completion:
SELECT * FROM pages WHERE entity_type = 'habit_completion' AND entity_id = ?;
```

### 3.2 Entity Links (`entity_links` Table)

The `entity_links` table enables `[[wiki-link]]` style references from any page to any entity across the platform. When a user types `[[Project Alpha]]` in a note, an entity link record is created.

**Supported entity types** (from the CHECK constraint in ADR-002):

`task`, `task_time_log`, `project`, `milestone`, `contact`, `interaction`, `habit`, `habit_completion`, `routine_action`, `course`, `book`, `book_chapter`, `study_session`, `study_topic`, `scheduled_study_session`, `study_plan_batch`, `flashcard_deck`, `skill`, `knowledge_note`, `language`, `language_practice_session`, `language_recording`, `purpose`, `target`, `purpose_metric_value`, `account`, `transaction`, `asset`, `liability`, `investment`, `income_stream`, `bucket_list_item`, `daily_check_in`, `achievement`

**Link structure:**
```
page ──1:N──> entity_links (page_id, entity_type, entity_id, context)
```

The `context` field (encrypted) stores a text snippet surrounding the link for backlink preview display.

### 3.3 Page Links (`page_links` Table)

Bidirectional wiki-style links between pages. When a user links one note to another via `[[Note Title]]`, a `page_links` record is created.

```
page_A ──> page_links ──> page_B
page_B's backlink panel shows page_A
```

**Indexed for fast backlink queries:**
```sql
CREATE INDEX idx_page_links_target ON page_links(target_page_id);
```

### 3.4 Entity Link Preview Cards

When a user hovers over an `[[entity-link]]` in the editor, the system displays a **rich preview card** showing:

- Entity name and type icon
- Current status and relevant date
- Description excerpt and key metrics
- Quick-action buttons (e.g., mark task complete)

The preview card display is **user-configurable** — users can customize which fields appear per entity type or per specific link via Preferences. This configuration is stored in `user_preferences`.

**Freshness:** On-demand. Preview data is fetched on hover, not pre-loaded.

**Code governance:**
- `packages/core/src/services/backlink-service.ts` — Entity link resolution and preview data
- `packages/editor/src/extensions/entity-link.ts` — `[[wiki-link]]` parsing and rendering
- `packages/editor/src/extensions/backlink-panel.ts` — Backlink panel component

---

## 4. Task Cross-References

Tasks are the most connected entity after pages. A single task can belong to a project, a milestone, a course, and be assigned to a contact — all via direct foreign keys.

### Foreign Key References

| FK on `tasks` | Target Table | Target Module | Purpose |
|---------------|-------------|---------------|---------|
| `project_id` | `projects` | Projects | Task belongs to a project |
| `milestone_id` | `milestones` | Projects | Task belongs to a milestone within a project |
| `course_id` | `courses` | Learning | Task is academic work for a course |
| `contact_id` | `contacts` | Relationships | Task involves or is delegated to a contact |
| `parent_task_id` | `tasks` | Tasks (self) | Sub-task hierarchy |

### Display Strategy

**Task detail page:** Shows **inline previews** of linked entities — the entity's name, status badge, and a link to navigate to it. This requires cross-module queries when loading the task detail.

**Task list views:** Shows **clickable links only** — just the entity name as a navigable link. No cross-module queries on list render, keeping list performance fast.

### Reverse Navigation

From the providing module's perspective:

| Providing Module View | Shows |
|----------------------|-------|
| Project detail | All tasks with `project_id = this project` |
| Milestone detail | All tasks with `milestone_id = this milestone` |
| Course detail | All tasks with `course_id = this course` |
| Contact detail | All tasks with `contact_id = this contact` |

These reverse queries are standard filtered reads, not cross-module integrations per se — the task data is queried directly.

---

## 5. Purpose Junction Tables

The Purposes & Goals module links to three other modules through junction tables, creating a goal-tracking hierarchy.

### Junction Tables

| Junction Table | Links | Purpose |
|---------------|-------|---------|
| `purpose_habits` | `purposes` <-> `habits` | Habits contributing to a life purpose |
| `purpose_routines` | `purposes` <-> `routine_actions` | Routines contributing to a life purpose |
| `purpose_projects` | `purposes` <-> `projects` | Projects contributing to a life purpose |
| `project_habits` | `projects` <-> `habits` | Habits tracked within a project context |

### Aggregated Progress

When viewing a Purpose, the UI computes **aggregated progress** from all linked entities:

| Linked Module | Aggregation | Metric |
|--------------|-------------|--------|
| Habits | Completion rate over last 7/30 days | "75% of linked habits completed this week" |
| Habits | Current streak of linked habits | Streak indicator per habit |
| Routines | Completion rate over last 7/30 days | "90% of linked routines completed this week" |
| Projects | Average progress percentage | "Linked projects: 60% average progress" |

**Implementation:** The purpose detail view queries each junction table, then fetches summary data from the linked module's tables. This is an **on-demand** integration — computed when the user opens a purpose detail page.

**Code governance:**
- Future `packages/core/src/services/purpose-service.ts` — Aggregation queries
- `packages/core/src/db/schema.ts` — Junction table definitions

---

## 6. Study Planner Integrations

The Study Planner is the most integration-heavy subsystem within Learning. It uses polymorphic references to schedule sessions across multiple learning resource types.

### Polymorphic References

The `scheduled_study_sessions` and `study_sessions` tables use `resource_type`/`resource_id` to reference:

| `resource_type` | Target Table | Module |
|-----------------|-------------|--------|
| `course` | `courses` | Learning |
| `book` | `books` | Learning |
| `book_chapter` | `book_chapters` | Learning |
| `study_topic` | `study_topics` | Knowledge |
| `flashcard_deck` | `flashcard_decks` | Knowledge |
| `homework` | (task with `course_id`) | Tasks/Learning |
| `article` | (external URL) | Learning |
| `video` | (external URL) | Learning |
| `podcast` | (external URL) | Learning |

### Bidirectional Navigation (Lazy-Loaded)

Each learning entity's detail page includes a **collapsible "Study Sessions" section** that loads on expand. This section shows:

- Past study sessions (duration, focus rating, key learnings)
- Upcoming scheduled sessions (date, time, urgency score)

**Implementation:** The section is **lazy-loaded** — no query runs until the user expands it. This avoids upfront query cost on every entity detail page.

### Skill Resources

The `skill_resources` table links skills to learning resources via the same polymorphic pattern:

```
skill ──> skill_resources (resource_type, resource_id) ──> course | book | topic | ...
```

This enables "What skills am I building by studying this course?" and "What resources help me improve this skill?" queries.

---

## 7. Gamification Integrations

The gamification system (XP, levels, achievements) observes actions across all modules. It uses a **distributed model** — each module's service is responsible for emitting its own XP events.

### XP Event Flow

```
Module service (e.g., habit-service) completes an action
    |
    v
Service calls gamification API: awardXP({ action, xp, entityType, entityId })
    |
    v
Gamification writes to xp_history, updates user_profile.total_xp
    |
    v
Gamification checks achievement conditions
    |
    v
If achievement unlocked -> writes to user_achievements, creates notification
```

### XP Triggers by Module

| Module | Action | XP Award |
|--------|--------|----------|
| Tasks | Complete a task | Variable by difficulty |
| Habits | Complete daily habit | Base XP |
| Habits | Achieve streak milestone (7, 30, 100 days) | Bonus XP |
| Routines | Complete full routine | Base XP |
| Learning | Complete a study session | XP based on duration |
| Learning | Master a flashcard deck | Bonus XP |
| Learning | Complete a course | Large XP bonus |
| Finance | Log a transaction | Small XP |
| Relationships | Log an interaction | Base XP |
| Check-ins | Complete a daily check-in | Base XP |
| Check-ins | Maintain check-in streak | Bonus XP |
| Pomodoro | Complete a focus session | XP based on duration |
| Bucket List | Complete a bucket list item | Large XP bonus |

### Achievement Detection

Each module service checks for module-specific achievements after actions. Examples:

- **Habits:** "Complete 7 consecutive days" — service checks streak after each completion
- **Learning:** "Study 100 hours total" — service checks cumulative hours after each session
- **Finance:** "Log 30 consecutive days of transactions" — service checks streak after each log

**Code governance:**
- `packages/core/src/db/schema.ts` — `xpHistory`, `achievements`, `userAchievements` tables
- Future per-module services emit XP events
- Future `packages/core/src/services/gamification-service.ts` — XP accounting and achievement checking

---

## 8. Notification Integrations

The notification system generates alerts from significant events across all modules. **All notification categories are user-configurable** — users opt in or out per category via Preferences.

### Notification Categories

| Category | Source Module | Events | Default |
|----------|-------------|--------|---------|
| **Task reminders** | Tasks | Due date approaching, overdue tasks | On |
| **Habit reminders** | Habits | Time-of-day habit reminders | On |
| **Streak warnings** | Habits | Streak at risk of breaking ("Complete today to keep your 15-day streak") | On |
| **Contact reminders** | Relationships | Stay-in-touch due, birthday/anniversary approaching | On |
| **Study reminders** | Learning | Scheduled study session starting, study plan due dates | On |
| **Financial reminders** | Finance | Recurring transaction due, liability payment due | On |
| **Check-in prompts** | Check-ins | Morning/evening check-in time (per template schedule) | On |
| **Achievement alerts** | Gamification | Achievement unlocked, level up, XP milestone | On |
| **Pomodoro alerts** | Pomodoro | Focus session complete, break over | On |

### User Configuration

Notification preferences are stored in `user_preferences` and include:

- **Per-category toggle:** Enable/disable each category independently
- **Quiet hours:** Global quiet window (e.g., 10 PM - 7 AM) during which no notifications fire
- **Per-platform control:** Different settings for web, mobile, and desktop

The notification dispatch pipeline checks user preferences **before** creating any `notifications` record:

```
Event occurs in module
    |
    v
Module service calls notification dispatch
    |
    v
Dispatch reads user_preferences for this category
    |
    v
Category enabled? --No--> Drop silently
    |
   Yes
    |
    v
Within quiet hours? --Yes--> Queue for after quiet hours
    |
   No
    |
    v
Create notifications record + platform-native push (mobile/desktop)
```

**Code governance:**
- `packages/core/src/db/schema.ts` — `notifications`, `userPreferences` tables
- Future `packages/core/src/services/notification-service.ts` — Dispatch pipeline
- `packages/types/src/entities/user.ts` — `UserPreferences` notification fields

---

## 9. Data Freshness Strategy

Cross-module integrations use one of two freshness strategies based on user impact.

### Reactive Integrations

These views auto-refresh when their source data changes. Implemented via React Query cache invalidation — when a mutation succeeds in a providing module, it invalidates the consuming view's query keys.

| View | Invalidated By |
|------|---------------|
| Journal daily summary | Any write to habits, tasks, routines, study_sessions, transactions, interactions for the current date |
| Dashboard widgets | Same as journal summary (if dashboard exists) |

**Cache key pattern:** `['journal-summary', journalDate]` — invalidated by mutations in any of the 6 providing modules.

### On-Demand Integrations

All other cross-module views fetch data when the user navigates to them. Standard React Query with appropriate `staleTime` settings.

| View | Data Source | Stale Time |
|------|-----------|------------|
| Task detail (linked entities) | Projects, milestones, courses, contacts | 30s |
| Purpose detail (aggregated progress) | Habits, routines, projects via junction tables | 30s |
| Entity link preview card | Any entity table | 60s |
| Backlink panel | `entity_links`, `page_links` | 30s |
| Study sessions on entity | `study_sessions`, `scheduled_study_sessions` | 60s |
| Notification dispatch | `user_preferences` | 5 min |

### Why Not Fully Reactive

Making all integrations reactive would require every mutation in every module to know which cross-module views might be affected and invalidate their cache keys. This creates tight coupling between modules and makes cache invalidation logic grow combinatorially. The on-demand approach keeps modules independent while the reactive subset covers the highest-impact views.

---

## 10. Polymorphic Reference Registry

Multiple tables use polymorphic `entity_type`/`entity_id` or `resource_type`/`resource_id` patterns. This registry documents every polymorphic reference point for maintainability.

| Table | Polymorphic Columns | Valid Entity Types | Purpose |
|-------|--------------------|--------------------|---------|
| `pages` | `entity_type`, `entity_id` | Any entity that can have linked notes | Link a page to the entity it documents |
| `entity_links` | `entity_type`, `entity_id` | 34 entity types (see section 3.2) | `[[wiki-link]]` from a page to any entity |
| `pomodoro_sessions` | `entity_type`, `entity_id` | `task`, `task_group`, `class_note`, `note`, `study_session` | Link a focus timer to what the user is working on |
| `notifications` | `entity_type`, `entity_id` | Any entity that generates notifications | Link a notification to its source entity |
| `xp_history` | `entity_type`, `entity_id` | Any entity that awards XP | Link an XP event to what triggered it |
| `study_sessions` | `resource_type`, `resource_id` | `course`, `book`, `book_chapter`, `study_topic`, `flashcard_deck`, `homework`, `article`, `video`, `podcast` | Link a study session to its learning resource |
| `scheduled_study_sessions` | `resource_type`, `resource_id` | Same as `study_sessions` | Link a planned session to its learning resource |
| `skill_resources` | `resource_type`, `resource_id` | `course`, `book`, `study_topic`, `article`, `video` | Link a skill to resources that develop it |
| `flashcard_decks` | `resource_type`, `resource_id` | `course`, `book`, `study_topic` | Link a deck to its source material |

---

## References

- **ADR-002 section 5.2** — `pages`, `page_links`, `entity_links` table definitions
- **ADR-002 section 8** — Cross-domain relationship map and polymorphic reference points
- **ADR-003 section 4.2** — Yjs CRDT sync for page content (separate sync unit from structured metadata)
- **Architecture.md sections 3.6-3.8** — Entity linking, backlinks, journal summary patterns
