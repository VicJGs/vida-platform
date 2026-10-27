// ============================================================================
// Migration 001 — Initial schema
// Creates ALL tables, indexes, and constraints for Vida Platform.
// Matches schema.ts and ADR-002 exactly.
//
// Table creation order respects FK dependencies:
//   1. Infrastructure (app_state, sync_queue)
//   2. Independent entities (projects, courses, contacts, purposes, habits)
//   3. Dependent entities (milestones → projects, tasks → projects/courses/contacts)
//   4. Junction tables (purpose_habits, etc.)
//   5. FTS5 virtual tables
// ============================================================================

import type { Migration } from '../adapter'

// ---------------------------------------------------------------------------
// Reusable SQL fragments
// ---------------------------------------------------------------------------

const SYNC_COLS = `
  _sync_id        TEXT NOT NULL UNIQUE,
  _sync_version   INTEGER NOT NULL DEFAULT 1,
  _sync_device_id TEXT NOT NULL,
  _sync_lww_ts    INTEGER NOT NULL,
  _sync_status    TEXT NOT NULL DEFAULT 'pending',
  _sync_hash      TEXT`

const BASE_COLS = `
  id         TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ${SYNC_COLS}`

const sql = (s: string) => ({ sql: s })

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

const migration: Migration = {
  version: 1,
  name: 'initial_schema',

  up(db) {
    db.batch([
      // ==================== INFRASTRUCTURE ===================================

      sql(`CREATE TABLE app_state (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`),

      sql(`CREATE TABLE sync_queue (
        id            TEXT PRIMARY KEY,
        table_name    TEXT NOT NULL,
        row_id        TEXT NOT NULL,
        operation     TEXT NOT NULL,
        payload       TEXT,
        status        TEXT NOT NULL DEFAULT 'pending',
        retry_count   INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at    INTEGER NOT NULL
      )`),
      sql(`CREATE INDEX idx_sync_queue_status ON sync_queue(status)`),

      // ==================== NOTES & PAGES ====================================

      sql(`CREATE TABLE pages (
        ${BASE_COLS},
        type           TEXT NOT NULL DEFAULT 'note',
        title          TEXT,
        content        TEXT,
        parent_id      TEXT REFERENCES pages(id) ON DELETE SET NULL,
        entity_type    TEXT,
        entity_id      TEXT,
        journal_date   TEXT,
        is_favorite    INTEGER NOT NULL DEFAULT 0,
        is_archived    INTEGER NOT NULL DEFAULT 0,
        icon           TEXT,
        cover_image    TEXT,
        summary_config TEXT,
        has_pomodoro   INTEGER NOT NULL DEFAULT 0,
        word_count     INTEGER NOT NULL DEFAULT 0,
        deleted_at     INTEGER
      )`),
      sql(`CREATE INDEX idx_pages_type ON pages(type)`),
      sql(`CREATE INDEX idx_pages_journal_date ON pages(journal_date)`),
      sql(`CREATE INDEX idx_pages_entity ON pages(entity_type, entity_id)`),
      sql(`CREATE INDEX idx_pages_deleted ON pages(deleted_at)`),
      sql(`CREATE UNIQUE INDEX idx_pages_journal_unique ON pages(journal_date)`),

      sql(`CREATE TABLE page_links (
        id             TEXT PRIMARY KEY,
        source_page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        target_page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        context        TEXT,
        created_at     INTEGER NOT NULL,
        ${SYNC_COLS},
        UNIQUE(source_page_id, target_page_id)
      )`),
      sql(`CREATE INDEX idx_page_links_target ON page_links(target_page_id)`),

      sql(`CREATE TABLE entity_links (
        id          TEXT PRIMARY KEY,
        page_id     TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        entity_id   TEXT NOT NULL,
        context     TEXT,
        created_at  INTEGER NOT NULL,
        ${SYNC_COLS},
        UNIQUE(page_id, entity_type, entity_id)
      )`),
      sql(`CREATE INDEX idx_entity_links_entity ON entity_links(entity_type, entity_id)`),

      sql(`CREATE TABLE tags (
        ${BASE_COLS},
        name  TEXT NOT NULL UNIQUE,
        color TEXT
      )`),

      sql(`CREATE TABLE page_tags (
        page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        ${SYNC_COLS},
        UNIQUE(page_id, tag_id)
      )`),

      sql(`CREATE TABLE note_attachments (
        id             TEXT PRIMARY KEY,
        page_id        TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        filename       TEXT NOT NULL,
        mime_type      TEXT NOT NULL,
        encrypted_blob BLOB NOT NULL,
        thumbnail_blob BLOB,
        size_bytes     INTEGER NOT NULL,
        created_at     INTEGER NOT NULL,
        ${SYNC_COLS}
      )`),
      sql(`CREATE INDEX idx_attachments_page ON note_attachments(page_id)`),

      sql(`CREATE TABLE pomodoro_sessions (
        ${BASE_COLS},
        page_id          TEXT REFERENCES pages(id) ON DELETE SET NULL,
        entity_type      TEXT,
        entity_id        TEXT,
        started_at       INTEGER NOT NULL,
        ended_at         INTEGER,
        duration_seconds INTEGER,
        type             TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'running',
        completed_count  INTEGER NOT NULL DEFAULT 0
      )`),
      sql(`CREATE INDEX idx_pomodoro_page ON pomodoro_sessions(page_id)`),
      sql(`CREATE INDEX idx_pomodoro_entity ON pomodoro_sessions(entity_type, entity_id)`),

      // ==================== PROJECTS =========================================

      sql(`CREATE TABLE projects (
        ${BASE_COLS},
        title           TEXT NOT NULL,
        description     TEXT,
        vision          TEXT,
        scope           TEXT DEFAULT 'personal',
        complexity      TEXT DEFAULT 'moderate',
        status          TEXT NOT NULL DEFAULT 'not_started',
        priority        TEXT NOT NULL DEFAULT 'medium',
        progress        INTEGER NOT NULL DEFAULT 0,
        start_date      TEXT,
        target_end_date TEXT,
        actual_end_date TEXT,
        estimated_hours INTEGER,
        actual_hours    INTEGER,
        tags            TEXT,
        color           TEXT,
        icon            TEXT,
        deleted_at      INTEGER
      )`),
      sql(`CREATE INDEX idx_projects_status ON projects(status)`),

      sql(`CREATE TABLE milestones (
        ${BASE_COLS},
        project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        parent_milestone_id TEXT REFERENCES milestones(id) ON DELETE SET NULL,
        title               TEXT NOT NULL,
        description         TEXT,
        status              TEXT NOT NULL DEFAULT 'not_started',
        progress            INTEGER NOT NULL DEFAULT 0,
        due_date            TEXT,
        sort_order          INTEGER NOT NULL DEFAULT 0,
        deleted_at          INTEGER
      )`),
      sql(`CREATE INDEX idx_milestones_project ON milestones(project_id)`),

      sql(`CREATE TABLE project_documents (
        ${BASE_COLS},
        project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        milestone_id   TEXT REFERENCES milestones(id) ON DELETE SET NULL,
        name           TEXT NOT NULL,
        file_type      TEXT,
        file_size      INTEGER,
        encrypted_blob BLOB
      )`),

      // ==================== COURSES ==========================================

      sql(`CREATE TABLE courses (
        ${BASE_COLS},
        title             TEXT NOT NULL,
        description       TEXT,
        provider          TEXT,
        instructor        TEXT,
        url               TEXT,
        course_type       TEXT,
        status            TEXT NOT NULL DEFAULT 'not_started',
        progress          INTEGER NOT NULL DEFAULT 0,
        total_modules     INTEGER NOT NULL DEFAULT 0,
        completed_modules INTEGER NOT NULL DEFAULT 0,
        start_date        TEXT,
        end_date          TEXT,
        target_completion TEXT,
        estimated_hours   INTEGER,
        rating            INTEGER,
        tags              TEXT,
        metadata          TEXT,
        deleted_at        INTEGER
      )`),

      // ==================== CONTACTS =========================================

      sql(`CREATE TABLE contacts (
        ${BASE_COLS},
        first_name              TEXT NOT NULL,
        last_name               TEXT,
        nickname                TEXT,
        relationship_type       TEXT DEFAULT 'acquaintance',
        email                   TEXT,
        phone                   TEXT,
        avatar_url              TEXT,
        company                 TEXT,
        job_title               TEXT,
        location                TEXT,
        birthday                TEXT,
        tags                    TEXT,
        social_links            TEXT,
        stay_in_touch_frequency TEXT,
        stay_in_touch_days      INTEGER,
        last_interaction_date   TEXT,
        next_contact_date       TEXT,
        interaction_count       INTEGER NOT NULL DEFAULT 0,
        is_favorite             INTEGER NOT NULL DEFAULT 0,
        deleted_at              INTEGER
      )`),

      // ==================== TASKS ============================================

      sql(`CREATE TABLE tasks (
        ${BASE_COLS},
        project_id        TEXT REFERENCES projects(id) ON DELETE SET NULL,
        milestone_id      TEXT REFERENCES milestones(id) ON DELETE SET NULL,
        course_id         TEXT REFERENCES courses(id) ON DELETE SET NULL,
        contact_id        TEXT REFERENCES contacts(id) ON DELETE SET NULL,
        parent_task_id    TEXT REFERENCES tasks(id) ON DELETE CASCADE,
        title             TEXT NOT NULL,
        description       TEXT,
        status            TEXT NOT NULL DEFAULT 'not_started',
        priority          TEXT NOT NULL DEFAULT 'medium',
        difficulty        TEXT DEFAULT 'medium',
        due_date          TEXT,
        estimated_minutes INTEGER,
        actual_minutes    INTEGER,
        tags              TEXT,
        sort_order        INTEGER NOT NULL DEFAULT 0,
        deleted_at        INTEGER
      )`),
      sql(`CREATE INDEX idx_tasks_project ON tasks(project_id)`),
      sql(`CREATE INDEX idx_tasks_milestone ON tasks(milestone_id)`),
      sql(`CREATE INDEX idx_tasks_course ON tasks(course_id)`),
      sql(`CREATE INDEX idx_tasks_contact ON tasks(contact_id)`),
      sql(`CREATE INDEX idx_tasks_parent ON tasks(parent_task_id)`),
      sql(`CREATE INDEX idx_tasks_status ON tasks(status)`),
      sql(`CREATE INDEX idx_tasks_due ON tasks(due_date)`),

      sql(`CREATE TABLE task_time_logs (
        id               TEXT PRIMARY KEY,
        task_id          TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        start_time       INTEGER NOT NULL,
        end_time         INTEGER,
        duration_minutes INTEGER,
        created_at       INTEGER NOT NULL,
        ${SYNC_COLS}
      )`),
      sql(`CREATE INDEX idx_time_logs_task ON task_time_logs(task_id)`),

      // ==================== HABITS ===========================================

      sql(`CREATE TABLE habits (
        ${BASE_COLS},
        name              TEXT NOT NULL,
        description       TEXT,
        habit_type        TEXT NOT NULL DEFAULT 'build',
        frequency         TEXT NOT NULL DEFAULT 'daily',
        days_of_week      TEXT,
        target_count      INTEGER NOT NULL DEFAULT 1,
        unit              TEXT,
        time_of_day       TEXT DEFAULT 'anytime',
        times_of_day      TEXT,
        cue               TEXT,
        reward            TEXT,
        domain            TEXT,
        tags              TEXT,
        current_streak    INTEGER NOT NULL DEFAULT 0,
        longest_streak    INTEGER NOT NULL DEFAULT 0,
        total_completions INTEGER NOT NULL DEFAULT 0,
        is_active         INTEGER NOT NULL DEFAULT 1,
        sort_order        INTEGER NOT NULL DEFAULT 0,
        deleted_at        INTEGER
      )`),
      sql(`CREATE INDEX idx_habits_active ON habits(is_active)`),

      sql(`CREATE TABLE habit_completions (
        id             TEXT PRIMARY KEY,
        habit_id       TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        completed_date TEXT NOT NULL,
        count          INTEGER NOT NULL DEFAULT 1,
        value          REAL,
        mood_before    INTEGER,
        mood_after     INTEGER,
        ease_rating    INTEGER,
        satisfaction   INTEGER,
        created_at     INTEGER NOT NULL,
        ${SYNC_COLS},
        UNIQUE(habit_id, completed_date)
      )`),
      sql(`CREATE INDEX idx_habit_comp_date ON habit_completions(completed_date)`),

      // ==================== ROUTINES =========================================

      sql(`CREATE TABLE routine_actions (
        ${BASE_COLS},
        title                TEXT NOT NULL,
        description          TEXT,
        action_type          TEXT NOT NULL DEFAULT 'task',
        time_of_day          TEXT NOT NULL DEFAULT 'morning',
        duration_minutes     INTEGER,
        is_active            INTEGER NOT NULL DEFAULT 1,
        sort_order           INTEGER NOT NULL DEFAULT 0,
        linked_habit_id      TEXT REFERENCES habits(id) ON DELETE SET NULL,
        linked_task_id       TEXT REFERENCES tasks(id) ON DELETE SET NULL,
        recurrence_frequency TEXT NOT NULL DEFAULT 'daily',
        recurrence_days      TEXT,
        skip_dates           TEXT,
        deleted_at           INTEGER
      )`),
      sql(`CREATE INDEX idx_routines_time ON routine_actions(time_of_day)`),

      sql(`CREATE TABLE routine_completions (
        id                      TEXT PRIMARY KEY,
        routine_action_id       TEXT NOT NULL REFERENCES routine_actions(id) ON DELETE CASCADE,
        completed_date          TEXT NOT NULL,
        completed_at            INTEGER NOT NULL,
        skipped                 INTEGER NOT NULL DEFAULT 0,
        skip_reason             TEXT,
        actual_duration_minutes INTEGER,
        ${SYNC_COLS},
        UNIQUE(routine_action_id, completed_date)
      )`),
      sql(`CREATE INDEX idx_routine_comp_date ON routine_completions(completed_date)`),

      // ==================== PURPOSE & GOALS ==================================

      sql(`CREATE TABLE purposes (
        ${BASE_COLS},
        title       TEXT NOT NULL,
        description TEXT,
        vision      TEXT,
        why         TEXT,
        domain      TEXT,
        status      TEXT NOT NULL DEFAULT 'in_progress',
        progress    INTEGER NOT NULL DEFAULT 0,
        start_date  TEXT,
        target_date TEXT,
        is_primary  INTEGER NOT NULL DEFAULT 0,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        deleted_at  INTEGER
      )`),

      sql(`CREATE TABLE targets (
        ${BASE_COLS},
        purpose_id       TEXT NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,
        title            TEXT NOT NULL,
        description      TEXT,
        target_type      TEXT NOT NULL DEFAULT 'quantitative',
        target_value     REAL,
        current_value    REAL,
        unit             TEXT,
        status           TEXT NOT NULL DEFAULT 'not_started',
        priority         TEXT NOT NULL DEFAULT 'medium',
        start_date       TEXT,
        target_date      TEXT,
        review_frequency TEXT DEFAULT 'weekly',
        next_review_date TEXT,
        sort_order       INTEGER NOT NULL DEFAULT 0,
        deleted_at       INTEGER
      )`),
      sql(`CREATE INDEX idx_targets_purpose ON targets(purpose_id)`),

      sql(`CREATE TABLE purpose_metrics (
        ${BASE_COLS},
        purpose_id         TEXT NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,
        name               TEXT NOT NULL,
        description        TEXT,
        unit               TEXT,
        target_value       REAL,
        current_value      REAL,
        calculation_method TEXT NOT NULL DEFAULT 'latest'
      )`),

      sql(`CREATE TABLE purpose_metric_values (
        id          TEXT PRIMARY KEY,
        metric_id   TEXT NOT NULL REFERENCES purpose_metrics(id) ON DELETE CASCADE,
        value       REAL NOT NULL,
        recorded_at INTEGER NOT NULL,
        ${SYNC_COLS}
      )`),
      sql(`CREATE INDEX idx_metric_values_metric ON purpose_metric_values(metric_id)`),

      sql(`CREATE TABLE target_reviews (
        id              TEXT PRIMARY KEY,
        target_id       TEXT NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
        progress_rating INTEGER,
        reflection      TEXT,
        next_actions    TEXT,
        reviewed_at     INTEGER NOT NULL,
        ${SYNC_COLS}
      )`),

      sql(`CREATE TABLE dreams (
        ${BASE_COLS},
        title          TEXT NOT NULL,
        description    TEXT,
        domain         TEXT,
        target_age     INTEGER,
        estimated_cost INTEGER,
        purpose_id     TEXT REFERENCES purposes(id) ON DELETE SET NULL,
        deleted_at     INTEGER
      )`),

      // --- Purpose junction tables ---

      sql(`CREATE TABLE purpose_habits (
        purpose_id TEXT NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,
        habit_id   TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        ${SYNC_COLS},
        UNIQUE(purpose_id, habit_id)
      )`),

      sql(`CREATE TABLE purpose_routines (
        purpose_id        TEXT NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,
        routine_action_id TEXT NOT NULL REFERENCES routine_actions(id) ON DELETE CASCADE,
        ${SYNC_COLS},
        UNIQUE(purpose_id, routine_action_id)
      )`),

      sql(`CREATE TABLE purpose_projects (
        purpose_id TEXT NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        ${SYNC_COLS},
        UNIQUE(purpose_id, project_id)
      )`),

      sql(`CREATE TABLE project_habits (
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        habit_id   TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        ${SYNC_COLS},
        UNIQUE(project_id, habit_id)
      )`),

      // ==================== FINANCE ==========================================

      sql(`CREATE TABLE accounts (
        ${BASE_COLS},
        name            TEXT NOT NULL,
        account_type    TEXT NOT NULL,
        institution     TEXT,
        currency        TEXT NOT NULL DEFAULT 'USD',
        current_balance INTEGER NOT NULL DEFAULT 0,
        credit_limit    INTEGER,
        interest_rate   INTEGER,
        is_active       INTEGER NOT NULL DEFAULT 1,
        color           TEXT,
        icon            TEXT,
        deleted_at      INTEGER
      )`),

      sql(`CREATE TABLE transactions (
        ${BASE_COLS},
        account_id             TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        transfer_to_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
        transaction_type       TEXT NOT NULL,
        amount                 INTEGER NOT NULL,
        currency               TEXT NOT NULL DEFAULT 'USD',
        category               TEXT,
        subcategory            TEXT,
        description            TEXT,
        date                   TEXT NOT NULL,
        is_recurring           INTEGER NOT NULL DEFAULT 0,
        recurring_frequency    TEXT,
        tags                   TEXT,
        deleted_at             INTEGER
      )`),
      sql(`CREATE INDEX idx_transactions_account ON transactions(account_id)`),
      sql(`CREATE INDEX idx_transactions_date ON transactions(date)`),

      sql(`CREATE TABLE assets (
        ${BASE_COLS},
        name              TEXT NOT NULL,
        asset_type        TEXT NOT NULL,
        purchase_date     TEXT,
        purchase_price    INTEGER,
        current_value     INTEGER,
        depreciation_rate INTEGER,
        location          TEXT,
        deleted_at        INTEGER
      )`),

      sql(`CREATE TABLE liabilities (
        ${BASE_COLS},
        name            TEXT NOT NULL,
        liability_type  TEXT NOT NULL,
        original_amount INTEGER,
        current_balance INTEGER,
        interest_rate   INTEGER,
        monthly_payment INTEGER,
        due_date        TEXT,
        lender          TEXT,
        deleted_at      INTEGER
      )`),

      sql(`CREATE TABLE investments (
        ${BASE_COLS},
        account_id      TEXT REFERENCES accounts(id) ON DELETE SET NULL,
        name            TEXT NOT NULL,
        investment_type TEXT NOT NULL,
        ticker_symbol   TEXT,
        quantity        REAL,
        purchase_price  INTEGER,
        current_price   INTEGER,
        deleted_at      INTEGER
      )`),

      sql(`CREATE TABLE income_streams (
        ${BASE_COLS},
        name        TEXT NOT NULL,
        income_type TEXT NOT NULL,
        work_type   TEXT,
        amount      INTEGER NOT NULL,
        frequency   TEXT NOT NULL DEFAULT 'monthly',
        is_active   INTEGER NOT NULL DEFAULT 1,
        employer    TEXT,
        start_date  TEXT,
        end_date    TEXT,
        deleted_at  INTEGER
      )`),

      // ==================== RELATIONSHIPS (remaining) ========================

      sql(`CREATE TABLE contact_events (
        ${BASE_COLS},
        contact_id   TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        event_type   TEXT NOT NULL DEFAULT 'custom',
        event_date   TEXT NOT NULL,
        title        TEXT,
        description  TEXT,
        is_recurring INTEGER NOT NULL DEFAULT 1,
        reminder_days TEXT
      )`),
      sql(`CREATE INDEX idx_contact_events_contact ON contact_events(contact_id)`),

      sql(`CREATE TABLE interactions (
        ${BASE_COLS},
        contact_id       TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        interaction_type TEXT NOT NULL DEFAULT 'in_person',
        date             TEXT NOT NULL,
        duration_minutes INTEGER,
        summary          TEXT,
        sentiment        TEXT,
        follow_up_needed INTEGER NOT NULL DEFAULT 0,
        follow_up_date   TEXT,
        follow_up_notes  TEXT
      )`),
      sql(`CREATE INDEX idx_interactions_contact ON interactions(contact_id)`),
      sql(`CREATE INDEX idx_interactions_date ON interactions(date)`),

      sql(`CREATE TABLE reminder_groups (
        ${BASE_COLS},
        name             TEXT NOT NULL,
        message_template TEXT,
        time_of_day      TEXT,
        frequency        TEXT,
        days_of_week     TEXT,
        is_active        INTEGER NOT NULL DEFAULT 1
      )`),

      sql(`CREATE TABLE contact_reminders (
        ${BASE_COLS},
        contact_id        TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        reminder_group_id TEXT REFERENCES reminder_groups(id) ON DELETE SET NULL,
        title             TEXT NOT NULL,
        reminder_date     TEXT,
        is_recurring      INTEGER NOT NULL DEFAULT 0,
        frequency         TEXT,
        is_completed      INTEGER NOT NULL DEFAULT 0
      )`),

      sql(`CREATE TABLE reminder_group_contacts (
        reminder_group_id TEXT NOT NULL REFERENCES reminder_groups(id) ON DELETE CASCADE,
        contact_id        TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        ${SYNC_COLS},
        UNIQUE(reminder_group_id, contact_id)
      )`),

      // ==================== LEARNING (remaining) =============================

      sql(`CREATE TABLE books (
        ${BASE_COLS},
        title        TEXT NOT NULL,
        author       TEXT,
        isbn         TEXT,
        format       TEXT DEFAULT 'physical',
        status       TEXT NOT NULL DEFAULT 'want_to_read',
        total_pages  INTEGER NOT NULL DEFAULT 0,
        current_page INTEGER NOT NULL DEFAULT 0,
        progress     INTEGER NOT NULL DEFAULT 0,
        start_date   TEXT,
        end_date     TEXT,
        rating       INTEGER,
        review       TEXT,
        cover_url    TEXT,
        genre        TEXT,
        tags         TEXT,
        deleted_at   INTEGER
      )`),

      sql(`CREATE TABLE book_chapters (
        ${BASE_COLS},
        book_id                   TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        title                     TEXT NOT NULL,
        chapter_number            INTEGER NOT NULL,
        start_page                INTEGER,
        end_page                  INTEGER,
        estimated_reading_minutes INTEGER,
        actual_reading_minutes    INTEGER,
        is_completed              INTEGER NOT NULL DEFAULT 0,
        completed_at              INTEGER,
        sort_order                INTEGER NOT NULL DEFAULT 0,
        UNIQUE(book_id, chapter_number)
      )`),

      sql(`CREATE TABLE skills (
        ${BASE_COLS},
        parent_skill_id        TEXT REFERENCES skills(id) ON DELETE SET NULL,
        name                   TEXT NOT NULL,
        description            TEXT,
        mastery_level          TEXT NOT NULL DEFAULT 'novice',
        practice_hours         INTEGER NOT NULL DEFAULT 0,
        last_practiced         INTEGER,
        proficiency_test_score INTEGER,
        deleted_at             INTEGER
      )`),

      sql(`CREATE TABLE skill_resources (
        id            TEXT PRIMARY KEY,
        skill_id      TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        resource_type TEXT NOT NULL,
        resource_id   TEXT NOT NULL,
        ${SYNC_COLS},
        UNIQUE(skill_id, resource_type, resource_id)
      )`),

      sql(`CREATE TABLE study_sessions (
        id                TEXT PRIMARY KEY,
        resource_type     TEXT NOT NULL,
        resource_id       TEXT NOT NULL,
        duration_minutes  INTEGER NOT NULL,
        focus_rating      INTEGER,
        energy_level      INTEGER,
        distraction_count INTEGER NOT NULL DEFAULT 0,
        pages_read        INTEGER,
        lessons_completed INTEGER,
        key_learnings     TEXT,
        started_at        INTEGER NOT NULL,
        ended_at          INTEGER,
        created_at        INTEGER NOT NULL,
        ${SYNC_COLS}
      )`),
      sql(`CREATE INDEX idx_study_sessions_resource ON study_sessions(resource_type, resource_id)`),
      sql(`CREATE INDEX idx_study_sessions_date ON study_sessions(started_at)`),

      // ==================== KNOWLEDGE ========================================

      sql(`CREATE TABLE study_topics (
        ${BASE_COLS},
        course_id               TEXT REFERENCES courses(id) ON DELETE SET NULL,
        linked_book_id          TEXT REFERENCES books(id) ON DELETE SET NULL,
        reading_chapter_id      TEXT REFERENCES book_chapters(id) ON DELETE SET NULL,
        title                   TEXT NOT NULL,
        description             TEXT,
        status                  TEXT NOT NULL DEFAULT 'not_started',
        mastery_level           INTEGER NOT NULL DEFAULT 0,
        difficulty              TEXT DEFAULT 'medium',
        due_date                TEXT,
        is_exam_topic           INTEGER NOT NULL DEFAULT 0,
        study_time_minutes      INTEGER NOT NULL DEFAULT 0,
        estimated_study_minutes INTEGER NOT NULL DEFAULT 30,
        key_concepts            TEXT,
        resource_urls           TEXT,
        sort_order              INTEGER NOT NULL DEFAULT 0,
        easiness_factor         REAL NOT NULL DEFAULT 2.5,
        repetition_number       INTEGER NOT NULL DEFAULT 0,
        interval_days           INTEGER NOT NULL DEFAULT 1,
        next_review_date        TEXT,
        last_reviewed_at        INTEGER,
        class_date              TEXT,
        reading_start_page      INTEGER,
        reading_end_page        INTEGER,
        deleted_at              INTEGER
      )`),
      sql(`CREATE INDEX idx_study_topics_course ON study_topics(course_id)`),
      sql(`CREATE INDEX idx_study_topics_review ON study_topics(next_review_date)`),

      sql(`CREATE TABLE topic_reviews (
        id                    TEXT PRIMARY KEY,
        topic_id              TEXT NOT NULL REFERENCES study_topics(id) ON DELETE CASCADE,
        quality               INTEGER NOT NULL,
        response_time_seconds INTEGER,
        reviewed_at           INTEGER NOT NULL,
        ${SYNC_COLS}
      )`),

      sql(`CREATE TABLE flashcard_decks (
        ${BASE_COLS},
        title            TEXT NOT NULL,
        description      TEXT,
        resource_type    TEXT,
        resource_id      TEXT,
        new_cards_per_day INTEGER NOT NULL DEFAULT 20,
        reviews_per_day  INTEGER NOT NULL DEFAULT 100,
        is_active        INTEGER NOT NULL DEFAULT 1,
        total_cards      INTEGER NOT NULL DEFAULT 0,
        mastered_cards   INTEGER NOT NULL DEFAULT 0,
        deleted_at       INTEGER
      )`),

      sql(`CREATE TABLE flashcards (
        ${BASE_COLS},
        deck_id          TEXT NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
        front            TEXT NOT NULL,
        back             TEXT NOT NULL,
        hint             TEXT,
        explanation      TEXT,
        easiness_factor  REAL NOT NULL DEFAULT 2.5,
        repetitions      INTEGER NOT NULL DEFAULT 0,
        interval_days    INTEGER NOT NULL DEFAULT 1,
        next_review_date TEXT,
        last_reviewed_at INTEGER,
        times_reviewed   INTEGER NOT NULL DEFAULT 0,
        times_correct    INTEGER NOT NULL DEFAULT 0,
        is_mastered      INTEGER NOT NULL DEFAULT 0,
        is_suspended     INTEGER NOT NULL DEFAULT 0
      )`),
      sql(`CREATE INDEX idx_flashcards_deck ON flashcards(deck_id)`),
      sql(`CREATE INDEX idx_flashcards_review ON flashcards(next_review_date)`),

      sql(`CREATE TABLE flashcard_reviews (
        id                TEXT PRIMARY KEY,
        flashcard_id      TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
        quality           INTEGER NOT NULL,
        response_time_ms  INTEGER,
        previous_interval INTEGER,
        new_interval      INTEGER,
        previous_easiness REAL,
        new_easiness      REAL,
        reviewed_at       INTEGER NOT NULL,
        ${SYNC_COLS}
      )`),

      sql(`CREATE TABLE knowledge_notes (
        ${BASE_COLS},
        parent_note_id TEXT REFERENCES knowledge_notes(id) ON DELETE SET NULL,
        resource_type  TEXT,
        resource_id    TEXT,
        title          TEXT NOT NULL,
        content        TEXT,
        topic          TEXT,
        subtopic       TEXT,
        tags           TEXT,
        is_pinned      INTEGER NOT NULL DEFAULT 0,
        is_archived    INTEGER NOT NULL DEFAULT 0,
        deleted_at     INTEGER
      )`),

      // ==================== STUDY PLANNER ====================================

      sql(`CREATE TABLE study_availability (
        ${BASE_COLS},
        day_of_week         INTEGER NOT NULL,
        start_time          TEXT NOT NULL,
        end_time            TEXT NOT NULL,
        is_available        INTEGER NOT NULL DEFAULT 1,
        preference_score    INTEGER,
        preset_block        TEXT,
        max_session_minutes INTEGER
      )`),

      sql(`CREATE TABLE availability_exceptions (
        id             TEXT PRIMARY KEY,
        exception_date TEXT NOT NULL,
        is_available   INTEGER NOT NULL,
        reason         TEXT,
        start_time     TEXT,
        end_time       TEXT,
        created_at     INTEGER NOT NULL,
        ${SYNC_COLS}
      )`),

      sql(`CREATE TABLE study_plan_batches (
        ${BASE_COLS},
        course_id      TEXT REFERENCES courses(id) ON DELETE SET NULL,
        name           TEXT,
        status         TEXT NOT NULL DEFAULT 'draft',
        total_sessions INTEGER NOT NULL DEFAULT 0,
        generated_at   INTEGER,
        approved_at    INTEGER
      )`),

      sql(`CREATE TABLE scheduled_study_sessions (
        ${BASE_COLS},
        batch_id         TEXT REFERENCES study_plan_batches(id) ON DELETE SET NULL,
        resource_type    TEXT NOT NULL,
        resource_id      TEXT NOT NULL,
        session_type     TEXT NOT NULL DEFAULT 'study',
        status           TEXT NOT NULL DEFAULT 'scheduled',
        scheduled_date   TEXT NOT NULL,
        start_time       TEXT,
        end_time         TEXT,
        duration_minutes INTEGER,
        urgency_score    REAL,
        start_page       INTEGER,
        end_page         INTEGER,
        chapter_id       TEXT REFERENCES book_chapters(id) ON DELETE SET NULL
      )`),
      sql(`CREATE INDEX idx_scheduled_sessions_date ON scheduled_study_sessions(scheduled_date)`),
      sql(`CREATE INDEX idx_scheduled_sessions_resource ON scheduled_study_sessions(resource_type, resource_id)`),

      sql(`CREATE TABLE session_templates (
        ${BASE_COLS},
        name                        TEXT NOT NULL,
        work_minutes                INTEGER NOT NULL DEFAULT 25,
        short_break_minutes         INTEGER NOT NULL DEFAULT 5,
        long_break_minutes          INTEGER NOT NULL DEFAULT 15,
        intervals_before_long_break INTEGER NOT NULL DEFAULT 4,
        auto_start_breaks           INTEGER NOT NULL DEFAULT 1,
        auto_start_work             INTEGER NOT NULL DEFAULT 0,
        is_default                  INTEGER NOT NULL DEFAULT 0
      )`),

      // ==================== LANGUAGES ========================================

      sql(`CREATE TABLE languages (
        ${BASE_COLS},
        language_name          TEXT NOT NULL,
        language_code          TEXT NOT NULL UNIQUE,
        flag_emoji             TEXT,
        target_proficiency     TEXT,
        current_proficiency    TEXT,
        status                 TEXT NOT NULL DEFAULT 'active',
        start_date             TEXT,
        listening_level        TEXT,
        speaking_level         TEXT,
        reading_level          TEXT,
        writing_level          TEXT,
        daily_goal_minutes     INTEGER NOT NULL DEFAULT 30,
        weekly_goal_sessions   INTEGER NOT NULL DEFAULT 5,
        current_streak         INTEGER NOT NULL DEFAULT 0,
        longest_streak         INTEGER NOT NULL DEFAULT 0,
        total_practice_minutes INTEGER NOT NULL DEFAULT 0,
        total_sessions         INTEGER NOT NULL DEFAULT 0,
        vocabulary_count       INTEGER NOT NULL DEFAULT 0,
        current_day_number     INTEGER NOT NULL DEFAULT 1,
        learning_phase         TEXT NOT NULL DEFAULT 'foundation',
        phase_started_at       INTEGER,
        resources              TEXT,
        deleted_at             INTEGER
      )`),

      sql(`CREATE TABLE language_practice_sessions (
        id                  TEXT PRIMARY KEY,
        language_id         TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        skill_type          TEXT NOT NULL,
        activity_type       TEXT NOT NULL,
        duration_minutes    INTEGER NOT NULL,
        new_words_learned   INTEGER NOT NULL DEFAULT 0,
        accuracy_percentage INTEGER,
        focus_rating        INTEGER,
        energy_level        INTEGER,
        content             TEXT,
        created_at          INTEGER NOT NULL,
        ${SYNC_COLS}
      )`),
      sql(`CREATE INDEX idx_practice_language ON language_practice_sessions(language_id)`),

      sql(`CREATE TABLE language_vocabulary (
        ${BASE_COLS},
        language_id                TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        word                       TEXT NOT NULL,
        translation                TEXT NOT NULL,
        pronunciation              TEXT,
        part_of_speech             TEXT,
        example_sentence           TEXT,
        meaning_in_target_language TEXT,
        source_activity            TEXT,
        mastery                    TEXT NOT NULL DEFAULT 'new',
        review_count               INTEGER NOT NULL DEFAULT 0,
        next_review_date           TEXT
      )`),
      sql(`CREATE INDEX idx_vocab_language ON language_vocabulary(language_id)`),
      sql(`CREATE INDEX idx_vocab_review ON language_vocabulary(next_review_date)`),

      sql(`CREATE TABLE language_weekly_plans (
        ${BASE_COLS},
        language_id        TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        week_start_date    TEXT NOT NULL,
        week_number        INTEGER NOT NULL,
        is_planned         INTEGER NOT NULL DEFAULT 0,
        topic              TEXT,
        song_title         TEXT,
        song_artist        TEXT,
        song_url           TEXT,
        song_lyrics        TEXT,
        current_song_day   INTEGER DEFAULT 1,
        bible_book         TEXT,
        bible_chapter      INTEGER,
        bible_verses_start INTEGER,
        bible_verses_end   INTEGER,
        planned_videos     TEXT,
        videos_watched     INTEGER NOT NULL DEFAULT 0,
        days_completed     INTEGER NOT NULL DEFAULT 0,
        weekly_reflection  TEXT,
        highlight_moments  TEXT,
        challenges_faced   TEXT,
        UNIQUE(language_id, week_start_date)
      )`),

      sql(`CREATE TABLE language_daily_sessions (
        ${BASE_COLS},
        language_id            TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        session_date           TEXT NOT NULL,
        day_number             INTEGER,
        weekly_plan_id         TEXT REFERENCES language_weekly_plans(id) ON DELETE SET NULL,
        weekly_topic           TEXT,
        grammar_video          INTEGER NOT NULL DEFAULT 0,
        vocabulary_video       INTEGER NOT NULL DEFAULT 0,
        conversation_video     INTEGER NOT NULL DEFAULT 0,
        music                  INTEGER NOT NULL DEFAULT 0,
        bible_listening        INTEGER NOT NULL DEFAULT 0,
        bible_recording        INTEGER NOT NULL DEFAULT 0,
        vocabulary_journal     INTEGER NOT NULL DEFAULT 0,
        grammar_video_url      TEXT,
        vocabulary_video_url   TEXT,
        conversation_video_url TEXT,
        song_day_number        INTEGER,
        bible_recording_id     TEXT,
        song_recording_id      TEXT,
        UNIQUE(language_id, session_date)
      )`),

      sql(`CREATE TABLE language_daily_progress (
        id                 TEXT PRIMARY KEY,
        language_id        TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        date               TEXT NOT NULL,
        listening_minutes  INTEGER NOT NULL DEFAULT 0,
        speaking_minutes   INTEGER NOT NULL DEFAULT 0,
        reading_minutes    INTEGER NOT NULL DEFAULT 0,
        writing_minutes    INTEGER NOT NULL DEFAULT 0,
        vocabulary_minutes INTEGER NOT NULL DEFAULT 0,
        grammar_minutes    INTEGER NOT NULL DEFAULT 0,
        total_minutes      INTEGER NOT NULL DEFAULT 0,
        sessions_count     INTEGER NOT NULL DEFAULT 0,
        goal_met           INTEGER NOT NULL DEFAULT 0,
        ${SYNC_COLS},
        UNIQUE(language_id, date)
      )`),

      sql(`CREATE TABLE language_recordings (
        id               TEXT PRIMARY KEY,
        language_id      TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        recording_type   TEXT NOT NULL,
        title            TEXT NOT NULL,
        audio_blob       BLOB,
        duration_seconds INTEGER,
        transcript       TEXT,
        compare_with_id  TEXT REFERENCES language_recordings(id) ON DELETE SET NULL,
        weekly_plan_id   TEXT REFERENCES language_weekly_plans(id) ON DELETE SET NULL,
        metadata         TEXT,
        created_at       INTEGER NOT NULL,
        ${SYNC_COLS}
      )`),

      sql(`CREATE TABLE language_base_words (
        id                         TEXT PRIMARY KEY,
        language_id                TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        category                   TEXT NOT NULL,
        english_word               TEXT NOT NULL,
        translation                TEXT,
        meaning_in_target_language TEXT,
        pronunciation              TEXT,
        is_learned                 INTEGER NOT NULL DEFAULT 0,
        learned_at                 INTEGER,
        linked_vocabulary_id       TEXT REFERENCES language_vocabulary(id) ON DELETE SET NULL,
        display_order              INTEGER,
        created_at                 INTEGER NOT NULL,
        ${SYNC_COLS},
        UNIQUE(language_id, category, english_word)
      )`),

      sql(`CREATE TABLE language_video_playlists (
        ${BASE_COLS},
        language_id         TEXT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
        playlist_url        TEXT NOT NULL,
        title               TEXT,
        total_videos        INTEGER NOT NULL DEFAULT 0,
        watched_count       INTEGER NOT NULL DEFAULT 0,
        current_video_index INTEGER NOT NULL DEFAULT 0
      )`),

      // ==================== ICS SYNC =========================================

      sql(`CREATE TABLE ics_feed_configs (
        ${BASE_COLS},
        feed_url             TEXT NOT NULL,
        feed_name            TEXT,
        is_active            INTEGER NOT NULL DEFAULT 1,
        auto_create_sessions INTEGER NOT NULL DEFAULT 0,
        default_course_id    TEXT REFERENCES courses(id) ON DELETE SET NULL,
        sync_interval_hours  INTEGER NOT NULL DEFAULT 6,
        last_synced_at       INTEGER,
        last_error           TEXT,
        metadata             TEXT
      )`),

      sql(`CREATE TABLE ics_synced_events (
        ${BASE_COLS},
        feed_id            TEXT NOT NULL REFERENCES ics_feed_configs(id) ON DELETE CASCADE,
        uid                TEXT NOT NULL,
        summary            TEXT,
        description        TEXT,
        location           TEXT,
        start_time         INTEGER NOT NULL,
        end_time           INTEGER,
        recurrence_rule    TEXT,
        matched_course_id  TEXT REFERENCES courses(id) ON DELETE SET NULL,
        created_session_id TEXT,
        is_ignored         INTEGER NOT NULL DEFAULT 0,
        raw_event          TEXT,
        UNIQUE(feed_id, uid)
      )`),

      // ==================== CHECK-INS ========================================

      sql(`CREATE TABLE check_in_templates (
        ${BASE_COLS},
        name           TEXT NOT NULL,
        description    TEXT,
        icon           TEXT DEFAULT 'clipboard-check',
        is_default     INTEGER NOT NULL DEFAULT 0,
        is_active      INTEGER NOT NULL DEFAULT 1,
        schedule_type  TEXT,
        schedule_days  TEXT,
        preferred_time TEXT,
        sort_order     INTEGER NOT NULL DEFAULT 0
      )`),

      sql(`CREATE TABLE daily_check_ins (
        ${BASE_COLS},
        check_in_date  TEXT NOT NULL UNIQUE,
        check_in_type  TEXT NOT NULL DEFAULT 'morning',
        template_id    TEXT REFERENCES check_in_templates(id) ON DELETE SET NULL,
        mood_score     INTEGER,
        energy_level   INTEGER,
        top_intentions TEXT,
        wins           TEXT,
        gratitude      TEXT,
        challenges     TEXT,
        tomorrow_focus TEXT,
        reflection     TEXT,
        custom_data    TEXT
      )`),

      sql(`CREATE TABLE check_in_template_questions (
        id          TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES check_in_templates(id) ON DELETE CASCADE,
        field_key   TEXT NOT NULL,
        label       TEXT NOT NULL,
        field_type  TEXT NOT NULL,
        placeholder TEXT,
        is_required INTEGER NOT NULL DEFAULT 0,
        min_value   INTEGER,
        max_value   INTEGER,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        ${SYNC_COLS},
        UNIQUE(template_id, field_key)
      )`),

      // ==================== BUCKET LIST ======================================

      sql(`CREATE TABLE bucket_list_items (
        ${BASE_COLS},
        title               TEXT NOT NULL,
        description         TEXT,
        category            TEXT DEFAULT 'other',
        status              TEXT NOT NULL DEFAULT 'dream',
        priority            TEXT NOT NULL DEFAULT 'medium',
        target_date         TEXT,
        completed_date      TEXT,
        estimated_cost      INTEGER,
        location            TEXT,
        image_url           TEXT,
        cover_image_url     TEXT,
        tags                TEXT,
        progress_percentage INTEGER NOT NULL DEFAULT 0,
        steps               TEXT,
        purpose_id          TEXT REFERENCES purposes(id) ON DELETE SET NULL,
        project_id          TEXT REFERENCES projects(id) ON DELETE SET NULL,
        inspiration_url     TEXT,
        deleted_at          INTEGER
      )`),

      // ==================== GAMIFICATION =====================================

      sql(`CREATE TABLE user_profile (
        ${BASE_COLS},
        persona                  TEXT,
        life_stage               TEXT,
        focus_areas              TEXT,
        motivation_style         TEXT,
        display_name             TEXT,
        avatar_url               TEXT,
        birth_date               TEXT,
        timezone                 TEXT DEFAULT 'UTC',
        total_xp                 INTEGER NOT NULL DEFAULT 0,
        current_level            INTEGER NOT NULL DEFAULT 1,
        check_in_streak          INTEGER NOT NULL DEFAULT 0,
        longest_check_in_streak  INTEGER NOT NULL DEFAULT 0,
        last_check_in_date       TEXT,
        onboarding_completed     INTEGER NOT NULL DEFAULT 0,
        skipped_modules          TEXT,
        active_modules           TEXT
      )`),

      sql(`CREATE TABLE achievements (
        id          TEXT PRIMARY KEY,
        key         TEXT NOT NULL UNIQUE,
        category    TEXT NOT NULL,
        tier        TEXT DEFAULT 'bronze',
        title       TEXT NOT NULL,
        description TEXT,
        icon        TEXT,
        xp_reward   INTEGER NOT NULL DEFAULT 0,
        condition   TEXT,
        is_secret   INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL
      )`),

      sql(`CREATE TABLE user_achievements (
        id             TEXT PRIMARY KEY,
        achievement_id TEXT NOT NULL UNIQUE REFERENCES achievements(id) ON DELETE CASCADE,
        earned_at      INTEGER NOT NULL,
        progress       TEXT,
        ${SYNC_COLS}
      )`),

      sql(`CREATE TABLE xp_history (
        id           TEXT PRIMARY KEY,
        action_type  TEXT NOT NULL,
        xp_amount    INTEGER NOT NULL,
        entity_type  TEXT,
        entity_id    TEXT,
        level_before INTEGER,
        level_after  INTEGER,
        earned_at    INTEGER NOT NULL,
        ${SYNC_COLS}
      )`),
      sql(`CREATE INDEX idx_xp_history_date ON xp_history(earned_at)`),

      // ==================== NOTIFICATIONS ====================================

      sql(`CREATE TABLE notifications (
        id           TEXT PRIMARY KEY,
        type         TEXT NOT NULL,
        title        TEXT NOT NULL,
        message      TEXT,
        action_url   TEXT,
        action_label TEXT,
        entity_type  TEXT,
        entity_id    TEXT,
        is_read      INTEGER NOT NULL DEFAULT 0,
        read_at      INTEGER,
        is_archived  INTEGER NOT NULL DEFAULT 0,
        archived_at  INTEGER,
        expires_at   INTEGER,
        created_at   INTEGER NOT NULL,
        ${SYNC_COLS}
      )`),
      sql(`CREATE INDEX idx_notifications_unread ON notifications(is_read)`),

      // ==================== PREFERENCES ======================================

      sql(`CREATE TABLE user_preferences (
        ${BASE_COLS},
        theme                           TEXT NOT NULL DEFAULT 'system',
        accent_color                    TEXT DEFAULT '#6366f1',
        date_format                     TEXT DEFAULT 'YYYY-MM-DD',
        time_format                     TEXT DEFAULT '24h',
        week_starts_on                  INTEGER DEFAULT 1,
        currency                        TEXT DEFAULT 'USD',
        dashboard_layout                TEXT,
        show_completed_tasks            INTEGER NOT NULL DEFAULT 1,
        default_task_priority           TEXT DEFAULT 'medium',
        pomodoro_work_minutes           INTEGER NOT NULL DEFAULT 25,
        pomodoro_break_minutes          INTEGER NOT NULL DEFAULT 5,
        pomodoro_long_break_minutes     INTEGER NOT NULL DEFAULT 15,
        pomodoro_sessions_before_long   INTEGER NOT NULL DEFAULT 4,
        notification_email              INTEGER NOT NULL DEFAULT 1,
        notification_push               INTEGER NOT NULL DEFAULT 1,
        notification_in_app             INTEGER NOT NULL DEFAULT 1,
        quiet_hours_enabled             INTEGER NOT NULL DEFAULT 0,
        quiet_hours_start               TEXT,
        quiet_hours_end                 TEXT,
        push_habits                     INTEGER NOT NULL DEFAULT 1,
        push_tasks                      INTEGER NOT NULL DEFAULT 1,
        push_routines                   INTEGER NOT NULL DEFAULT 1,
        push_contacts                   INTEGER NOT NULL DEFAULT 1,
        push_study                      INTEGER NOT NULL DEFAULT 1,
        feature_gamification            INTEGER NOT NULL DEFAULT 1
      )`),

      sql(`CREATE TABLE nav_preferences (
        ${BASE_COLS},
        dock_position    TEXT NOT NULL DEFAULT 'bottom',
        dock_auto_hide   INTEGER NOT NULL DEFAULT 0,
        dock_size        TEXT NOT NULL DEFAULT 'medium',
        mobile_nav_items TEXT,
        show_labels      INTEGER NOT NULL DEFAULT 1,
        haptic_feedback  INTEGER NOT NULL DEFAULT 1,
        reduce_motion    INTEGER NOT NULL DEFAULT 0
      )`),

      sql(`CREATE TABLE command_bar_history (
        id               TEXT PRIMARY KEY,
        command_key      TEXT NOT NULL UNIQUE,
        command_label    TEXT NOT NULL,
        command_category TEXT,
        use_count        INTEGER NOT NULL DEFAULT 1,
        last_used_at     INTEGER,
        is_pinned        INTEGER NOT NULL DEFAULT 0,
        ${SYNC_COLS}
      )`),

      // ==================== FTS5 VIRTUAL TABLES ==============================

      sql(`CREATE VIRTUAL TABLE IF NOT EXISTS fts_pages USING fts5(id UNINDEXED, title, content_text)`),
      sql(`CREATE VIRTUAL TABLE IF NOT EXISTS fts_tasks USING fts5(id UNINDEXED, title, description)`),
      sql(`CREATE VIRTUAL TABLE IF NOT EXISTS fts_contacts USING fts5(id UNINDEXED, first_name, last_name, company)`),
      sql(`CREATE VIRTUAL TABLE IF NOT EXISTS fts_courses USING fts5(id UNINDEXED, title, description, provider)`),
    ])
  },
}

export default migration
