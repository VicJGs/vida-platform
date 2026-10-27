// ============================================================================
// Drizzle ORM Schema — Vida Platform
// ADR-002 complete data model · SQLite (wa-sqlite / expo-sqlite / Tauri)
//
// Conventions:
//   PK:        UUIDv7 TEXT, client-generated
//   Timestamps: INTEGER (Unix ms)
//   Booleans:   INTEGER 0/1
//   Money:      INTEGER (cents)
//   JSON:       TEXT (JSON.stringify)
//   Dates:      TEXT (YYYY-MM-DD)
//   Encrypted:  marked with /* E */ comment
//   Sync:       _sync_* columns on every syncable table
// ============================================================================

import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
  uniqueIndex,
  index,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core'

// ---------------------------------------------------------------------------
// Helper: sync metadata columns (present on every syncable table)
// ---------------------------------------------------------------------------

const syncColumns = {
  _sync_id: text('_sync_id').notNull().unique(),
  _sync_version: integer('_sync_version').notNull().default(1),
  _sync_device_id: text('_sync_device_id').notNull(),
  _sync_lww_ts: integer('_sync_lww_ts').notNull(),
  _sync_status: text('_sync_status').notNull().default('pending'),
  _sync_hash: text('_sync_hash'),
}

// ---------------------------------------------------------------------------
// Helper: base entity columns (id + created_at + updated_at + sync)
// ---------------------------------------------------------------------------

const baseColumns = {
  id: text('id').primaryKey(),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
  ...syncColumns,
}

// ============================= INFRASTRUCTURE ==============================

export const appState = sqliteTable('app_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const syncQueue = sqliteTable(
  'sync_queue',
  {
    id: text('id').primaryKey(),
    table_name: text('table_name').notNull(),
    row_id: text('row_id').notNull(),
    operation: text('operation').notNull(),
    payload: text('payload'),
    status: text('status').notNull().default('pending'),
    retry_count: integer('retry_count').notNull().default(0),
    error_message: text('error_message'),
    created_at: integer('created_at').notNull(),
  },
  (t) => [index('idx_sync_queue_status').on(t.status)],
)

// ============================= NOTES & PAGES ===============================

export const pages = sqliteTable(
  'pages',
  {
    ...baseColumns,
    type: text('type').notNull().default('note'),
    title: text('title') /* E */,
    content: text('content') /* E */,
    parent_id: text('parent_id').references((): AnySQLiteColumn => pages.id, { onDelete: 'set null' }),
    entity_type: text('entity_type'),
    entity_id: text('entity_id'),
    journal_date: text('journal_date'),
    is_favorite: integer('is_favorite').notNull().default(0),
    is_archived: integer('is_archived').notNull().default(0),
    icon: text('icon'),
    cover_image: text('cover_image') /* E */,
    summary_config: text('summary_config') /* E */,
    has_pomodoro: integer('has_pomodoro').notNull().default(0),
    word_count: integer('word_count').notNull().default(0),
    deleted_at: integer('deleted_at'),
  },
  (t) => [
    index('idx_pages_type').on(t.type),
    index('idx_pages_journal_date').on(t.journal_date),
    index('idx_pages_entity').on(t.entity_type, t.entity_id),
    index('idx_pages_deleted').on(t.deleted_at),
    uniqueIndex('idx_pages_journal_unique').on(t.journal_date),
  ],
)

export const pageLinks = sqliteTable(
  'page_links',
  {
    id: text('id').primaryKey(),
    source_page_id: text('source_page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    target_page_id: text('target_page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    context: text('context') /* E */,
    created_at: integer('created_at').notNull(),
    ...syncColumns,
  },
  (t) => [
    uniqueIndex('idx_page_links_unique').on(t.source_page_id, t.target_page_id),
    index('idx_page_links_target').on(t.target_page_id),
  ],
)

export const entityLinks = sqliteTable(
  'entity_links',
  {
    id: text('id').primaryKey(),
    page_id: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    entity_type: text('entity_type').notNull(),
    entity_id: text('entity_id').notNull(),
    context: text('context') /* E */,
    created_at: integer('created_at').notNull(),
    ...syncColumns,
  },
  (t) => [
    uniqueIndex('idx_entity_links_unique').on(t.page_id, t.entity_type, t.entity_id),
    index('idx_entity_links_entity').on(t.entity_type, t.entity_id),
  ],
)

export const tags = sqliteTable('tags', {
  ...baseColumns,
  name: text('name').notNull().unique() /* E */,
  color: text('color'),
})

export const pageTags = sqliteTable(
  'page_tags',
  {
    page_id: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    tag_id: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    ...syncColumns,
  },
  (t) => [uniqueIndex('idx_page_tags_pk').on(t.page_id, t.tag_id)],
)

export const noteAttachments = sqliteTable(
  'note_attachments',
  {
    id: text('id').primaryKey(),
    page_id: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull() /* E */,
    mime_type: text('mime_type').notNull(),
    encrypted_blob: blob('encrypted_blob').notNull() /* E */,
    thumbnail_blob: blob('thumbnail_blob') /* E */,
    size_bytes: integer('size_bytes').notNull(),
    created_at: integer('created_at').notNull(),
    ...syncColumns,
  },
  (t) => [index('idx_attachments_page').on(t.page_id)],
)

export const pomodoroSessions = sqliteTable(
  'pomodoro_sessions',
  {
    ...baseColumns,
    page_id: text('page_id').references(() => pages.id, { onDelete: 'set null' }),
    entity_type: text('entity_type'),
    entity_id: text('entity_id'),
    started_at: integer('started_at').notNull(),
    ended_at: integer('ended_at'),
    duration_seconds: integer('duration_seconds'),
    type: text('type').notNull(),
    status: text('status').notNull().default('running'),
    completed_count: integer('completed_count').notNull().default(0),
  },
  (t) => [index('idx_pomodoro_page').on(t.page_id), index('idx_pomodoro_entity').on(t.entity_type, t.entity_id)],
)

// ================================= TASKS ===================================

export const tasks = sqliteTable(
  'tasks',
  {
    ...baseColumns,
    project_id: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    milestone_id: text('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
    course_id: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
    contact_id: text('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    parent_task_id: text('parent_task_id').references((): AnySQLiteColumn => tasks.id, { onDelete: 'cascade' }),
    title: text('title').notNull() /* E */,
    description: text('description') /* E */,
    status: text('status').notNull().default('not_started'),
    priority: text('priority').notNull().default('medium'),
    difficulty: text('difficulty').default('medium'),
    due_date: text('due_date'),
    estimated_minutes: integer('estimated_minutes'),
    actual_minutes: integer('actual_minutes'),
    tags: text('tags') /* E */,
    sort_order: integer('sort_order').notNull().default(0),
    deleted_at: integer('deleted_at'),
  },
  (t) => [
    index('idx_tasks_project').on(t.project_id),
    index('idx_tasks_milestone').on(t.milestone_id),
    index('idx_tasks_course').on(t.course_id),
    index('idx_tasks_contact').on(t.contact_id),
    index('idx_tasks_parent').on(t.parent_task_id),
    index('idx_tasks_status').on(t.status),
    index('idx_tasks_due').on(t.due_date),
  ],
)

export const taskTimeLogs = sqliteTable(
  'task_time_logs',
  {
    id: text('id').primaryKey(),
    task_id: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    start_time: integer('start_time').notNull(),
    end_time: integer('end_time'),
    duration_minutes: integer('duration_minutes'),
    created_at: integer('created_at').notNull(),
    ...syncColumns,
  },
  (t) => [index('idx_time_logs_task').on(t.task_id)],
)

// ================================ PROJECTS =================================

export const projects = sqliteTable(
  'projects',
  {
    ...baseColumns,
    title: text('title').notNull() /* E */,
    description: text('description') /* E */,
    vision: text('vision') /* E */,
    scope: text('scope').default('personal'),
    complexity: text('complexity').default('moderate'),
    status: text('status').notNull().default('not_started'),
    priority: text('priority').notNull().default('medium'),
    progress: integer('progress').notNull().default(0),
    start_date: text('start_date'),
    target_end_date: text('target_end_date'),
    actual_end_date: text('actual_end_date'),
    estimated_hours: integer('estimated_hours'),
    actual_hours: integer('actual_hours'),
    tags: text('tags') /* E */,
    color: text('color'),
    icon: text('icon'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_projects_status').on(t.status)],
)

export const milestones = sqliteTable(
  'milestones',
  {
    ...baseColumns,
    project_id: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    parent_milestone_id: text('parent_milestone_id').references((): AnySQLiteColumn => milestones.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull() /* E */,
    description: text('description') /* E */,
    status: text('status').notNull().default('not_started'),
    progress: integer('progress').notNull().default(0),
    due_date: text('due_date'),
    sort_order: integer('sort_order').notNull().default(0),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_milestones_project').on(t.project_id)],
)

export const projectDocuments = sqliteTable('project_documents', {
  ...baseColumns,
  project_id: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  milestone_id: text('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
  name: text('name').notNull() /* E */,
  file_type: text('file_type'),
  file_size: integer('file_size'),
  encrypted_blob: blob('encrypted_blob') /* E */,
})

// ================================= HABITS ==================================

export const habits = sqliteTable(
  'habits',
  {
    ...baseColumns,
    name: text('name').notNull() /* E */,
    description: text('description') /* E */,
    habit_type: text('habit_type').notNull().default('build'),
    frequency: text('frequency').notNull().default('daily'),
    days_of_week: text('days_of_week'),
    target_count: integer('target_count').notNull().default(1),
    unit: text('unit') /* E */,
    time_of_day: text('time_of_day').default('anytime'),
    times_of_day: text('times_of_day'),
    cue: text('cue') /* E */,
    reward: text('reward') /* E */,
    domain: text('domain'),
    tags: text('tags') /* E */,
    current_streak: integer('current_streak').notNull().default(0),
    longest_streak: integer('longest_streak').notNull().default(0),
    total_completions: integer('total_completions').notNull().default(0),
    is_active: integer('is_active').notNull().default(1),
    sort_order: integer('sort_order').notNull().default(0),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_habits_active').on(t.is_active)],
)

export const habitCompletions = sqliteTable(
  'habit_completions',
  {
    id: text('id').primaryKey(),
    habit_id: text('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    completed_date: text('completed_date').notNull(),
    count: integer('count').notNull().default(1),
    value: real('value'),
    mood_before: integer('mood_before'),
    mood_after: integer('mood_after'),
    ease_rating: integer('ease_rating'),
    satisfaction: integer('satisfaction'),
    created_at: integer('created_at').notNull(),
    ...syncColumns,
  },
  (t) => [
    uniqueIndex('idx_habit_comp_unique').on(t.habit_id, t.completed_date),
    index('idx_habit_comp_date').on(t.completed_date),
  ],
)

// ================================ ROUTINES =================================

export const routineActions = sqliteTable(
  'routine_actions',
  {
    ...baseColumns,
    title: text('title').notNull() /* E */,
    description: text('description') /* E */,
    action_type: text('action_type').notNull().default('task'),
    time_of_day: text('time_of_day').notNull().default('morning'),
    duration_minutes: integer('duration_minutes'),
    is_active: integer('is_active').notNull().default(1),
    sort_order: integer('sort_order').notNull().default(0),
    linked_habit_id: text('linked_habit_id').references(() => habits.id, { onDelete: 'set null' }),
    linked_task_id: text('linked_task_id').references(() => tasks.id, { onDelete: 'set null' }),
    recurrence_frequency: text('recurrence_frequency').notNull().default('daily'),
    recurrence_days: text('recurrence_days'),
    skip_dates: text('skip_dates'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_routines_time').on(t.time_of_day)],
)

export const routineCompletions = sqliteTable(
  'routine_completions',
  {
    id: text('id').primaryKey(),
    routine_action_id: text('routine_action_id')
      .notNull()
      .references(() => routineActions.id, { onDelete: 'cascade' }),
    completed_date: text('completed_date').notNull(),
    completed_at: integer('completed_at').notNull(),
    skipped: integer('skipped').notNull().default(0),
    skip_reason: text('skip_reason') /* E */,
    actual_duration_minutes: integer('actual_duration_minutes'),
    ...syncColumns,
  },
  (t) => [
    uniqueIndex('idx_routine_comp_unique').on(t.routine_action_id, t.completed_date),
    index('idx_routine_comp_date').on(t.completed_date),
  ],
)

// ============================ PURPOSE & GOALS ==============================

export const purposes = sqliteTable('purposes', {
  ...baseColumns,
  title: text('title').notNull() /* E */,
  description: text('description') /* E */,
  vision: text('vision') /* E */,
  why: text('why') /* E */,
  domain: text('domain'),
  status: text('status').notNull().default('in_progress'),
  progress: integer('progress').notNull().default(0),
  start_date: text('start_date'),
  target_date: text('target_date'),
  is_primary: integer('is_primary').notNull().default(0),
  sort_order: integer('sort_order').notNull().default(0),
  deleted_at: integer('deleted_at'),
})

export const targets = sqliteTable(
  'targets',
  {
    ...baseColumns,
    purpose_id: text('purpose_id')
      .notNull()
      .references(() => purposes.id, { onDelete: 'cascade' }),
    title: text('title').notNull() /* E */,
    description: text('description') /* E */,
    target_type: text('target_type').notNull().default('quantitative'),
    target_value: real('target_value'),
    current_value: real('current_value'),
    unit: text('unit') /* E */,
    status: text('status').notNull().default('not_started'),
    priority: text('priority').notNull().default('medium'),
    start_date: text('start_date'),
    target_date: text('target_date'),
    review_frequency: text('review_frequency').default('weekly'),
    next_review_date: text('next_review_date'),
    sort_order: integer('sort_order').notNull().default(0),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_targets_purpose').on(t.purpose_id)],
)

export const purposeMetrics = sqliteTable('purpose_metrics', {
  ...baseColumns,
  purpose_id: text('purpose_id')
    .notNull()
    .references(() => purposes.id, { onDelete: 'cascade' }),
  name: text('name').notNull() /* E */,
  description: text('description') /* E */,
  unit: text('unit') /* E */,
  target_value: real('target_value'),
  current_value: real('current_value'),
  calculation_method: text('calculation_method').notNull().default('latest'),
})

export const purposeMetricValues = sqliteTable(
  'purpose_metric_values',
  {
    id: text('id').primaryKey(),
    metric_id: text('metric_id')
      .notNull()
      .references(() => purposeMetrics.id, { onDelete: 'cascade' }),
    value: real('value').notNull(),
    recorded_at: integer('recorded_at').notNull(),
    ...syncColumns,
  },
  (t) => [index('idx_metric_values_metric').on(t.metric_id)],
)

export const targetReviews = sqliteTable('target_reviews', {
  id: text('id').primaryKey(),
  target_id: text('target_id')
    .notNull()
    .references(() => targets.id, { onDelete: 'cascade' }),
  progress_rating: integer('progress_rating'),
  reflection: text('reflection') /* E */,
  next_actions: text('next_actions') /* E */,
  reviewed_at: integer('reviewed_at').notNull(),
  ...syncColumns,
})

export const dreams = sqliteTable('dreams', {
  ...baseColumns,
  title: text('title').notNull() /* E */,
  description: text('description') /* E */,
  domain: text('domain'),
  target_age: integer('target_age'),
  estimated_cost: integer('estimated_cost') /* E */,
  purpose_id: text('purpose_id').references(() => purposes.id, { onDelete: 'set null' }),
  deleted_at: integer('deleted_at'),
})

// --- Purpose junction tables ---

export const purposeHabits = sqliteTable(
  'purpose_habits',
  {
    purpose_id: text('purpose_id')
      .notNull()
      .references(() => purposes.id, { onDelete: 'cascade' }),
    habit_id: text('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    ...syncColumns,
  },
  (t) => [uniqueIndex('idx_purpose_habits_pk').on(t.purpose_id, t.habit_id)],
)

export const purposeRoutines = sqliteTable(
  'purpose_routines',
  {
    purpose_id: text('purpose_id')
      .notNull()
      .references(() => purposes.id, { onDelete: 'cascade' }),
    routine_action_id: text('routine_action_id')
      .notNull()
      .references(() => routineActions.id, { onDelete: 'cascade' }),
    ...syncColumns,
  },
  (t) => [uniqueIndex('idx_purpose_routines_pk').on(t.purpose_id, t.routine_action_id)],
)

export const purposeProjects = sqliteTable(
  'purpose_projects',
  {
    purpose_id: text('purpose_id')
      .notNull()
      .references(() => purposes.id, { onDelete: 'cascade' }),
    project_id: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    ...syncColumns,
  },
  (t) => [uniqueIndex('idx_purpose_projects_pk').on(t.purpose_id, t.project_id)],
)

export const projectHabits = sqliteTable(
  'project_habits',
  {
    project_id: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    habit_id: text('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    ...syncColumns,
  },
  (t) => [uniqueIndex('idx_project_habits_pk').on(t.project_id, t.habit_id)],
)

// ================================ FINANCE ==================================

export const accounts = sqliteTable('accounts', {
  ...baseColumns,
  name: text('name').notNull() /* E */,
  account_type: text('account_type').notNull(),
  institution: text('institution') /* E */,
  currency: text('currency').notNull().default('USD'),
  current_balance: integer('current_balance').notNull().default(0) /* E */,
  credit_limit: integer('credit_limit') /* E */,
  interest_rate: integer('interest_rate') /* E */,
  is_active: integer('is_active').notNull().default(1),
  color: text('color'),
  icon: text('icon'),
  deleted_at: integer('deleted_at'),
})

export const transactions = sqliteTable(
  'transactions',
  {
    ...baseColumns,
    account_id: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    transfer_to_account_id: text('transfer_to_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    transaction_type: text('transaction_type').notNull(),
    amount: integer('amount').notNull() /* E */,
    currency: text('currency').notNull().default('USD'),
    category: text('category') /* E */,
    subcategory: text('subcategory') /* E */,
    description: text('description') /* E */,
    date: text('date').notNull(),
    is_recurring: integer('is_recurring').notNull().default(0),
    recurring_frequency: text('recurring_frequency'),
    tags: text('tags') /* E */,
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_transactions_account').on(t.account_id), index('idx_transactions_date').on(t.date)],
)

export const assets = sqliteTable('assets', {
  ...baseColumns,
  name: text('name').notNull() /* E */,
  asset_type: text('asset_type').notNull(),
  purchase_date: text('purchase_date'),
  purchase_price: integer('purchase_price') /* E */,
  current_value: integer('current_value') /* E */,
  depreciation_rate: integer('depreciation_rate') /* E */,
  location: text('location') /* E */,
  deleted_at: integer('deleted_at'),
})

export const liabilities = sqliteTable('liabilities', {
  ...baseColumns,
  name: text('name').notNull() /* E */,
  liability_type: text('liability_type').notNull(),
  original_amount: integer('original_amount') /* E */,
  current_balance: integer('current_balance') /* E */,
  interest_rate: integer('interest_rate') /* E */,
  monthly_payment: integer('monthly_payment') /* E */,
  due_date: text('due_date'),
  lender: text('lender') /* E */,
  deleted_at: integer('deleted_at'),
})

export const investments = sqliteTable('investments', {
  ...baseColumns,
  account_id: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  name: text('name').notNull() /* E */,
  investment_type: text('investment_type').notNull(),
  ticker_symbol: text('ticker_symbol') /* E */,
  quantity: real('quantity') /* E */,
  purchase_price: integer('purchase_price') /* E */,
  current_price: integer('current_price') /* E */,
  deleted_at: integer('deleted_at'),
})

export const incomeStreams = sqliteTable('income_streams', {
  ...baseColumns,
  name: text('name').notNull() /* E */,
  income_type: text('income_type').notNull(),
  work_type: text('work_type'),
  amount: integer('amount').notNull() /* E */,
  frequency: text('frequency').notNull().default('monthly'),
  is_active: integer('is_active').notNull().default(1),
  employer: text('employer') /* E */,
  start_date: text('start_date'),
  end_date: text('end_date'),
  deleted_at: integer('deleted_at'),
})

// ============================ RELATIONSHIPS ================================

export const contacts = sqliteTable('contacts', {
  ...baseColumns,
  first_name: text('first_name').notNull() /* E */,
  last_name: text('last_name') /* E */,
  nickname: text('nickname') /* E */,
  relationship_type: text('relationship_type').default('acquaintance'),
  email: text('email') /* E */,
  phone: text('phone') /* E */,
  avatar_url: text('avatar_url') /* E */,
  company: text('company') /* E */,
  job_title: text('job_title') /* E */,
  location: text('location') /* E */,
  birthday: text('birthday') /* E */,
  tags: text('tags') /* E */,
  social_links: text('social_links') /* E */,
  stay_in_touch_frequency: text('stay_in_touch_frequency'),
  stay_in_touch_days: integer('stay_in_touch_days'),
  last_interaction_date: text('last_interaction_date'),
  next_contact_date: text('next_contact_date'),
  interaction_count: integer('interaction_count').notNull().default(0),
  is_favorite: integer('is_favorite').notNull().default(0),
  deleted_at: integer('deleted_at'),
})

export const contactEvents = sqliteTable(
  'contact_events',
  {
    ...baseColumns,
    contact_id: text('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    event_type: text('event_type').notNull().default('custom'),
    event_date: text('event_date').notNull(),
    title: text('title') /* E */,
    description: text('description') /* E */,
    is_recurring: integer('is_recurring').notNull().default(1),
    reminder_days: text('reminder_days'),
  },
  (t) => [index('idx_contact_events_contact').on(t.contact_id)],
)

export const interactions = sqliteTable(
  'interactions',
  {
    ...baseColumns,
    contact_id: text('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    interaction_type: text('interaction_type').notNull().default('in_person'),
    date: text('date').notNull(),
    duration_minutes: integer('duration_minutes'),
    summary: text('summary') /* E */,
    sentiment: text('sentiment'),
    follow_up_needed: integer('follow_up_needed').notNull().default(0),
    follow_up_date: text('follow_up_date'),
    follow_up_notes: text('follow_up_notes') /* E */,
  },
  (t) => [index('idx_interactions_contact').on(t.contact_id), index('idx_interactions_date').on(t.date)],
)

export const contactReminders = sqliteTable('contact_reminders', {
  ...baseColumns,
  contact_id: text('contact_id')
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  reminder_group_id: text('reminder_group_id').references(() => reminderGroups.id, { onDelete: 'set null' }),
  title: text('title').notNull() /* E */,
  reminder_date: text('reminder_date'),
  is_recurring: integer('is_recurring').notNull().default(0),
  frequency: text('frequency'),
  is_completed: integer('is_completed').notNull().default(0),
})

export const reminderGroups = sqliteTable('reminder_groups', {
  ...baseColumns,
  name: text('name').notNull() /* E */,
  message_template: text('message_template') /* E */,
  time_of_day: text('time_of_day'),
  frequency: text('frequency'),
  days_of_week: text('days_of_week'),
  is_active: integer('is_active').notNull().default(1),
})

export const reminderGroupContacts = sqliteTable(
  'reminder_group_contacts',
  {
    reminder_group_id: text('reminder_group_id')
      .notNull()
      .references(() => reminderGroups.id, { onDelete: 'cascade' }),
    contact_id: text('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    ...syncColumns,
  },
  (t) => [uniqueIndex('idx_reminder_group_contacts_pk').on(t.reminder_group_id, t.contact_id)],
)

// ============================== LEARNING ===================================

export const courses = sqliteTable('courses', {
  ...baseColumns,
  title: text('title').notNull() /* E */,
  description: text('description') /* E */,
  provider: text('provider') /* E */,
  instructor: text('instructor') /* E */,
  url: text('url') /* E */,
  course_type: text('course_type'),
  status: text('status').notNull().default('not_started'),
  progress: integer('progress').notNull().default(0),
  total_modules: integer('total_modules').notNull().default(0),
  completed_modules: integer('completed_modules').notNull().default(0),
  start_date: text('start_date'),
  end_date: text('end_date'),
  target_completion: text('target_completion'),
  estimated_hours: integer('estimated_hours'),
  rating: integer('rating'),
  tags: text('tags') /* E */,
  metadata: text('metadata') /* E */,
  deleted_at: integer('deleted_at'),
})

export const books = sqliteTable('books', {
  ...baseColumns,
  title: text('title').notNull() /* E */,
  author: text('author') /* E */,
  isbn: text('isbn') /* E */,
  format: text('format').default('physical'),
  status: text('status').notNull().default('want_to_read'),
  total_pages: integer('total_pages').notNull().default(0),
  current_page: integer('current_page').notNull().default(0),
  progress: integer('progress').notNull().default(0),
  start_date: text('start_date'),
  end_date: text('end_date'),
  rating: integer('rating'),
  review: text('review') /* E */,
  cover_url: text('cover_url') /* E */,
  genre: text('genre') /* E */,
  tags: text('tags') /* E */,
  deleted_at: integer('deleted_at'),
})

export const bookChapters = sqliteTable(
  'book_chapters',
  {
    ...baseColumns,
    book_id: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    title: text('title').notNull() /* E */,
    chapter_number: integer('chapter_number').notNull(),
    start_page: integer('start_page'),
    end_page: integer('end_page'),
    estimated_reading_minutes: integer('estimated_reading_minutes'),
    actual_reading_minutes: integer('actual_reading_minutes'),
    is_completed: integer('is_completed').notNull().default(0),
    completed_at: integer('completed_at'),
    sort_order: integer('sort_order').notNull().default(0),
  },
  (t) => [uniqueIndex('idx_book_chapters_unique').on(t.book_id, t.chapter_number)],
)

export const skills = sqliteTable('skills', {
  ...baseColumns,
  parent_skill_id: text('parent_skill_id').references((): AnySQLiteColumn => skills.id, { onDelete: 'set null' }),
  name: text('name').notNull() /* E */,
  description: text('description') /* E */,
  mastery_level: text('mastery_level').notNull().default('novice'),
  practice_hours: integer('practice_hours').notNull().default(0),
  last_practiced: integer('last_practiced'),
  proficiency_test_score: integer('proficiency_test_score'),
  deleted_at: integer('deleted_at'),
})

export const skillResources = sqliteTable(
  'skill_resources',
  {
    id: text('id').primaryKey(),
    skill_id: text('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    resource_type: text('resource_type').notNull(),
    resource_id: text('resource_id').notNull(),
    ...syncColumns,
  },
  (t) => [uniqueIndex('idx_skill_resources_unique').on(t.skill_id, t.resource_type, t.resource_id)],
)

export const studySessions = sqliteTable(
  'study_sessions',
  {
    id: text('id').primaryKey(),
    resource_type: text('resource_type').notNull(),
    resource_id: text('resource_id').notNull(),
    duration_minutes: integer('duration_minutes').notNull(),
    focus_rating: integer('focus_rating'),
    energy_level: integer('energy_level'),
    distraction_count: integer('distraction_count').notNull().default(0),
    pages_read: integer('pages_read'),
    lessons_completed: integer('lessons_completed'),
    key_learnings: text('key_learnings') /* E */,
    started_at: integer('started_at').notNull(),
    ended_at: integer('ended_at'),
    created_at: integer('created_at').notNull(),
    ...syncColumns,
  },
  (t) => [
    index('idx_study_sessions_resource').on(t.resource_type, t.resource_id),
    index('idx_study_sessions_date').on(t.started_at),
  ],
)

// ============================== KNOWLEDGE ==================================

export const studyTopics = sqliteTable(
  'study_topics',
  {
    ...baseColumns,
    course_id: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
    linked_book_id: text('linked_book_id').references(() => books.id, { onDelete: 'set null' }),
    reading_chapter_id: text('reading_chapter_id').references(() => bookChapters.id, { onDelete: 'set null' }),
    title: text('title').notNull() /* E */,
    description: text('description') /* E */,
    status: text('status').notNull().default('not_started'),
    mastery_level: integer('mastery_level').notNull().default(0),
    difficulty: text('difficulty').default('medium'),
    due_date: text('due_date'),
    is_exam_topic: integer('is_exam_topic').notNull().default(0),
    study_time_minutes: integer('study_time_minutes').notNull().default(0),
    estimated_study_minutes: integer('estimated_study_minutes').notNull().default(30),
    key_concepts: text('key_concepts') /* E */,
    resource_urls: text('resource_urls') /* E */,
    sort_order: integer('sort_order').notNull().default(0),
    easiness_factor: real('easiness_factor').notNull().default(2.5),
    repetition_number: integer('repetition_number').notNull().default(0),
    interval_days: integer('interval_days').notNull().default(1),
    next_review_date: text('next_review_date'),
    last_reviewed_at: integer('last_reviewed_at'),
    class_date: text('class_date'),
    reading_start_page: integer('reading_start_page'),
    reading_end_page: integer('reading_end_page'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_study_topics_course').on(t.course_id), index('idx_study_topics_review').on(t.next_review_date)],
)

export const topicReviews = sqliteTable('topic_reviews', {
  id: text('id').primaryKey(),
  topic_id: text('topic_id')
    .notNull()
    .references(() => studyTopics.id, { onDelete: 'cascade' }),
  quality: integer('quality').notNull(),
  response_time_seconds: integer('response_time_seconds'),
  reviewed_at: integer('reviewed_at').notNull(),
  ...syncColumns,
})

export const flashcardDecks = sqliteTable('flashcard_decks', {
  ...baseColumns,
  title: text('title').notNull() /* E */,
  description: text('description') /* E */,
  resource_type: text('resource_type'),
  resource_id: text('resource_id'),
  new_cards_per_day: integer('new_cards_per_day').notNull().default(20),
  reviews_per_day: integer('reviews_per_day').notNull().default(100),
  is_active: integer('is_active').notNull().default(1),
  total_cards: integer('total_cards').notNull().default(0),
  mastered_cards: integer('mastered_cards').notNull().default(0),
  deleted_at: integer('deleted_at'),
})

export const flashcards = sqliteTable(
  'flashcards',
  {
    ...baseColumns,
    deck_id: text('deck_id')
      .notNull()
      .references(() => flashcardDecks.id, { onDelete: 'cascade' }),
    front: text('front').notNull() /* E */,
    back: text('back').notNull() /* E */,
    hint: text('hint') /* E */,
    explanation: text('explanation') /* E */,
    easiness_factor: real('easiness_factor').notNull().default(2.5),
    repetitions: integer('repetitions').notNull().default(0),
    interval_days: integer('interval_days').notNull().default(1),
    next_review_date: text('next_review_date'),
    last_reviewed_at: integer('last_reviewed_at'),
    times_reviewed: integer('times_reviewed').notNull().default(0),
    times_correct: integer('times_correct').notNull().default(0),
    is_mastered: integer('is_mastered').notNull().default(0),
    is_suspended: integer('is_suspended').notNull().default(0),
  },
  (t) => [index('idx_flashcards_deck').on(t.deck_id), index('idx_flashcards_review').on(t.next_review_date)],
)

export const flashcardReviews = sqliteTable('flashcard_reviews', {
  id: text('id').primaryKey(),
  flashcard_id: text('flashcard_id')
    .notNull()
    .references(() => flashcards.id, { onDelete: 'cascade' }),
  quality: integer('quality').notNull(),
  response_time_ms: integer('response_time_ms'),
  previous_interval: integer('previous_interval'),
  new_interval: integer('new_interval'),
  previous_easiness: real('previous_easiness'),
  new_easiness: real('new_easiness'),
  reviewed_at: integer('reviewed_at').notNull(),
  ...syncColumns,
})

export const knowledgeNotes = sqliteTable('knowledge_notes', {
  ...baseColumns,
  parent_note_id: text('parent_note_id').references((): AnySQLiteColumn => knowledgeNotes.id, { onDelete: 'set null' }),
  resource_type: text('resource_type'),
  resource_id: text('resource_id'),
  title: text('title').notNull() /* E */,
  content: text('content') /* E */,
  topic: text('topic') /* E */,
  subtopic: text('subtopic') /* E */,
  tags: text('tags') /* E */,
  is_pinned: integer('is_pinned').notNull().default(0),
  is_archived: integer('is_archived').notNull().default(0),
  deleted_at: integer('deleted_at'),
})

// ============================ STUDY PLANNER ================================

export const studyAvailability = sqliteTable('study_availability', {
  ...baseColumns,
  day_of_week: integer('day_of_week').notNull(),
  start_time: text('start_time').notNull(),
  end_time: text('end_time').notNull(),
  is_available: integer('is_available').notNull().default(1),
  preference_score: integer('preference_score'),
  preset_block: text('preset_block'),
  max_session_minutes: integer('max_session_minutes'),
})

export const availabilityExceptions = sqliteTable('availability_exceptions', {
  id: text('id').primaryKey(),
  exception_date: text('exception_date').notNull(),
  is_available: integer('is_available').notNull(),
  reason: text('reason') /* E */,
  start_time: text('start_time'),
  end_time: text('end_time'),
  created_at: integer('created_at').notNull(),
  ...syncColumns,
})

export const studyPlanBatches = sqliteTable('study_plan_batches', {
  ...baseColumns,
  course_id: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
  name: text('name') /* E */,
  status: text('status').notNull().default('draft'),
  total_sessions: integer('total_sessions').notNull().default(0),
  generated_at: integer('generated_at'),
  approved_at: integer('approved_at'),
})

export const scheduledStudySessions = sqliteTable(
  'scheduled_study_sessions',
  {
    ...baseColumns,
    batch_id: text('batch_id').references(() => studyPlanBatches.id, { onDelete: 'set null' }),
    resource_type: text('resource_type').notNull(),
    resource_id: text('resource_id').notNull(),
    session_type: text('session_type').notNull().default('study'),
    status: text('status').notNull().default('scheduled'),
    scheduled_date: text('scheduled_date').notNull(),
    start_time: text('start_time'),
    end_time: text('end_time'),
    duration_minutes: integer('duration_minutes'),
    urgency_score: real('urgency_score'),
    start_page: integer('start_page'),
    end_page: integer('end_page'),
    chapter_id: text('chapter_id').references(() => bookChapters.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('idx_scheduled_sessions_date').on(t.scheduled_date),
    index('idx_scheduled_sessions_resource').on(t.resource_type, t.resource_id),
  ],
)

export const sessionTemplates = sqliteTable('session_templates', {
  ...baseColumns,
  name: text('name').notNull() /* E */,
  work_minutes: integer('work_minutes').notNull().default(25),
  short_break_minutes: integer('short_break_minutes').notNull().default(5),
  long_break_minutes: integer('long_break_minutes').notNull().default(15),
  intervals_before_long_break: integer('intervals_before_long_break').notNull().default(4),
  auto_start_breaks: integer('auto_start_breaks').notNull().default(1),
  auto_start_work: integer('auto_start_work').notNull().default(0),
  is_default: integer('is_default').notNull().default(0),
})

// ============================ LANGUAGES ====================================

export const languages = sqliteTable('languages', {
  ...baseColumns,
  language_name: text('language_name').notNull(),
  language_code: text('language_code').notNull().unique(),
  flag_emoji: text('flag_emoji'),
  target_proficiency: text('target_proficiency'),
  current_proficiency: text('current_proficiency'),
  status: text('status').notNull().default('active'),
  start_date: text('start_date'),
  listening_level: text('listening_level'),
  speaking_level: text('speaking_level'),
  reading_level: text('reading_level'),
  writing_level: text('writing_level'),
  daily_goal_minutes: integer('daily_goal_minutes').notNull().default(30),
  weekly_goal_sessions: integer('weekly_goal_sessions').notNull().default(5),
  current_streak: integer('current_streak').notNull().default(0),
  longest_streak: integer('longest_streak').notNull().default(0),
  total_practice_minutes: integer('total_practice_minutes').notNull().default(0),
  total_sessions: integer('total_sessions').notNull().default(0),
  vocabulary_count: integer('vocabulary_count').notNull().default(0),
  current_day_number: integer('current_day_number').notNull().default(1),
  learning_phase: text('learning_phase').notNull().default('foundation'),
  phase_started_at: integer('phase_started_at'),
  resources: text('resources') /* E */,
  deleted_at: integer('deleted_at'),
})

export const languagePracticeSessions = sqliteTable(
  'language_practice_sessions',
  {
    id: text('id').primaryKey(),
    language_id: text('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'cascade' }),
    skill_type: text('skill_type').notNull(),
    activity_type: text('activity_type').notNull(),
    duration_minutes: integer('duration_minutes').notNull(),
    new_words_learned: integer('new_words_learned').notNull().default(0),
    accuracy_percentage: integer('accuracy_percentage'),
    focus_rating: integer('focus_rating'),
    energy_level: integer('energy_level'),
    content: text('content') /* E */,
    created_at: integer('created_at').notNull(),
    ...syncColumns,
  },
  (t) => [index('idx_practice_language').on(t.language_id)],
)

export const languageVocabulary = sqliteTable(
  'language_vocabulary',
  {
    ...baseColumns,
    language_id: text('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'cascade' }),
    word: text('word').notNull() /* E */,
    translation: text('translation').notNull() /* E */,
    pronunciation: text('pronunciation') /* E */,
    part_of_speech: text('part_of_speech'),
    example_sentence: text('example_sentence') /* E */,
    meaning_in_target_language: text('meaning_in_target_language') /* E */,
    source_activity: text('source_activity') /* E */,
    mastery: text('mastery').notNull().default('new'),
    review_count: integer('review_count').notNull().default(0),
    next_review_date: text('next_review_date'),
  },
  (t) => [index('idx_vocab_language').on(t.language_id), index('idx_vocab_review').on(t.next_review_date)],
)

export const languageDailySessions = sqliteTable(
  'language_daily_sessions',
  {
    ...baseColumns,
    language_id: text('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'cascade' }),
    session_date: text('session_date').notNull(),
    day_number: integer('day_number'),
    weekly_plan_id: text('weekly_plan_id').references(() => languageWeeklyPlans.id, { onDelete: 'set null' }),
    weekly_topic: text('weekly_topic'),
    grammar_video: integer('grammar_video').notNull().default(0),
    vocabulary_video: integer('vocabulary_video').notNull().default(0),
    conversation_video: integer('conversation_video').notNull().default(0),
    music: integer('music').notNull().default(0),
    bible_listening: integer('bible_listening').notNull().default(0),
    bible_recording: integer('bible_recording').notNull().default(0),
    vocabulary_journal: integer('vocabulary_journal').notNull().default(0),
    grammar_video_url: text('grammar_video_url') /* E */,
    vocabulary_video_url: text('vocabulary_video_url') /* E */,
    conversation_video_url: text('conversation_video_url') /* E */,
    song_day_number: integer('song_day_number'),
    bible_recording_id: text('bible_recording_id'),
    song_recording_id: text('song_recording_id'),
  },
  (t) => [uniqueIndex('idx_lang_daily_unique').on(t.language_id, t.session_date)],
)

export const languageDailyProgress = sqliteTable(
  'language_daily_progress',
  {
    id: text('id').primaryKey(),
    language_id: text('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    listening_minutes: integer('listening_minutes').notNull().default(0),
    speaking_minutes: integer('speaking_minutes').notNull().default(0),
    reading_minutes: integer('reading_minutes').notNull().default(0),
    writing_minutes: integer('writing_minutes').notNull().default(0),
    vocabulary_minutes: integer('vocabulary_minutes').notNull().default(0),
    grammar_minutes: integer('grammar_minutes').notNull().default(0),
    total_minutes: integer('total_minutes').notNull().default(0),
    sessions_count: integer('sessions_count').notNull().default(0),
    goal_met: integer('goal_met').notNull().default(0),
    ...syncColumns,
  },
  (t) => [uniqueIndex('idx_lang_progress_unique').on(t.language_id, t.date)],
)

export const languageRecordings = sqliteTable('language_recordings', {
  id: text('id').primaryKey(),
  language_id: text('language_id')
    .notNull()
    .references(() => languages.id, { onDelete: 'cascade' }),
  recording_type: text('recording_type').notNull(),
  title: text('title').notNull() /* E */,
  audio_blob: blob('audio_blob') /* E */,
  duration_seconds: integer('duration_seconds'),
  transcript: text('transcript') /* E */,
  compare_with_id: text('compare_with_id').references((): AnySQLiteColumn => languageRecordings.id, {
    onDelete: 'set null',
  }),
  weekly_plan_id: text('weekly_plan_id').references(() => languageWeeklyPlans.id, { onDelete: 'set null' }),
  metadata: text('metadata') /* E */,
  created_at: integer('created_at').notNull(),
  ...syncColumns,
})

export const languageWeeklyPlans = sqliteTable(
  'language_weekly_plans',
  {
    ...baseColumns,
    language_id: text('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'cascade' }),
    week_start_date: text('week_start_date').notNull(),
    week_number: integer('week_number').notNull(),
    is_planned: integer('is_planned').notNull().default(0),
    topic: text('topic'),
    song_title: text('song_title') /* E */,
    song_artist: text('song_artist') /* E */,
    song_url: text('song_url') /* E */,
    song_lyrics: text('song_lyrics') /* E */,
    current_song_day: integer('current_song_day').default(1),
    bible_book: text('bible_book') /* E */,
    bible_chapter: integer('bible_chapter'),
    bible_verses_start: integer('bible_verses_start'),
    bible_verses_end: integer('bible_verses_end'),
    planned_videos: text('planned_videos') /* E */,
    videos_watched: integer('videos_watched').notNull().default(0),
    days_completed: integer('days_completed').notNull().default(0),
    weekly_reflection: text('weekly_reflection') /* E */,
    highlight_moments: text('highlight_moments') /* E */,
    challenges_faced: text('challenges_faced') /* E */,
  },
  (t) => [uniqueIndex('idx_lang_weekly_unique').on(t.language_id, t.week_start_date)],
)

export const languageBaseWords = sqliteTable(
  'language_base_words',
  {
    id: text('id').primaryKey(),
    language_id: text('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    english_word: text('english_word').notNull() /* E */,
    translation: text('translation') /* E */,
    meaning_in_target_language: text('meaning_in_target_language') /* E */,
    pronunciation: text('pronunciation') /* E */,
    is_learned: integer('is_learned').notNull().default(0),
    learned_at: integer('learned_at'),
    linked_vocabulary_id: text('linked_vocabulary_id').references(() => languageVocabulary.id, {
      onDelete: 'set null',
    }),
    display_order: integer('display_order'),
    created_at: integer('created_at').notNull(),
    ...syncColumns,
  },
  (t) => [uniqueIndex('idx_base_words_unique').on(t.language_id, t.category, t.english_word)],
)

export const languageVideoPlaylists = sqliteTable('language_video_playlists', {
  ...baseColumns,
  language_id: text('language_id')
    .notNull()
    .references(() => languages.id, { onDelete: 'cascade' }),
  playlist_url: text('playlist_url').notNull() /* E */,
  title: text('title') /* E */,
  total_videos: integer('total_videos').notNull().default(0),
  watched_count: integer('watched_count').notNull().default(0),
  current_video_index: integer('current_video_index').notNull().default(0),
})

// ============================== ICS SYNC ===================================

export const icsFeedConfigs = sqliteTable('ics_feed_configs', {
  ...baseColumns,
  feed_url: text('feed_url').notNull() /* E */,
  feed_name: text('feed_name') /* E */,
  is_active: integer('is_active').notNull().default(1),
  auto_create_sessions: integer('auto_create_sessions').notNull().default(0),
  default_course_id: text('default_course_id').references(() => courses.id, { onDelete: 'set null' }),
  sync_interval_hours: integer('sync_interval_hours').notNull().default(6),
  last_synced_at: integer('last_synced_at'),
  last_error: text('last_error') /* E */,
  metadata: text('metadata') /* E */,
})

export const icsSyncedEvents = sqliteTable(
  'ics_synced_events',
  {
    ...baseColumns,
    feed_id: text('feed_id')
      .notNull()
      .references(() => icsFeedConfigs.id, { onDelete: 'cascade' }),
    uid: text('uid').notNull(),
    summary: text('summary') /* E */,
    description: text('description') /* E */,
    location: text('location') /* E */,
    start_time: integer('start_time').notNull(),
    end_time: integer('end_time'),
    recurrence_rule: text('recurrence_rule'),
    matched_course_id: text('matched_course_id').references(() => courses.id, { onDelete: 'set null' }),
    created_session_id: text('created_session_id'),
    is_ignored: integer('is_ignored').notNull().default(0),
    raw_event: text('raw_event') /* E */,
  },
  (t) => [uniqueIndex('idx_ics_events_unique').on(t.feed_id, t.uid)],
)

// ============================== CHECK-INS ==================================

export const dailyCheckIns = sqliteTable('daily_check_ins', {
  ...baseColumns,
  check_in_date: text('check_in_date').notNull().unique(),
  check_in_type: text('check_in_type').notNull().default('morning'),
  template_id: text('template_id').references(() => checkInTemplates.id, { onDelete: 'set null' }),
  mood_score: integer('mood_score'),
  energy_level: integer('energy_level'),
  top_intentions: text('top_intentions') /* E */,
  wins: text('wins') /* E */,
  gratitude: text('gratitude') /* E */,
  challenges: text('challenges') /* E */,
  tomorrow_focus: text('tomorrow_focus') /* E */,
  reflection: text('reflection') /* E */,
  custom_data: text('custom_data') /* E */,
})

export const checkInTemplates = sqliteTable('check_in_templates', {
  ...baseColumns,
  name: text('name').notNull() /* E */,
  description: text('description') /* E */,
  icon: text('icon').default('clipboard-check'),
  is_default: integer('is_default').notNull().default(0),
  is_active: integer('is_active').notNull().default(1),
  schedule_type: text('schedule_type'),
  schedule_days: text('schedule_days'),
  preferred_time: text('preferred_time'),
  sort_order: integer('sort_order').notNull().default(0),
})

export const checkInTemplateQuestions = sqliteTable(
  'check_in_template_questions',
  {
    id: text('id').primaryKey(),
    template_id: text('template_id')
      .notNull()
      .references(() => checkInTemplates.id, { onDelete: 'cascade' }),
    field_key: text('field_key').notNull(),
    label: text('label').notNull() /* E */,
    field_type: text('field_type').notNull(),
    placeholder: text('placeholder') /* E */,
    is_required: integer('is_required').notNull().default(0),
    min_value: integer('min_value'),
    max_value: integer('max_value'),
    sort_order: integer('sort_order').notNull().default(0),
    ...syncColumns,
  },
  (t) => [uniqueIndex('idx_template_questions_unique').on(t.template_id, t.field_key)],
)

// ============================= BUCKET LIST =================================

export const bucketListItems = sqliteTable('bucket_list_items', {
  ...baseColumns,
  title: text('title').notNull() /* E */,
  description: text('description') /* E */,
  category: text('category').default('other'),
  status: text('status').notNull().default('dream'),
  priority: text('priority').notNull().default('medium'),
  target_date: text('target_date'),
  completed_date: text('completed_date'),
  estimated_cost: integer('estimated_cost') /* E */,
  location: text('location') /* E */,
  image_url: text('image_url') /* E */,
  cover_image_url: text('cover_image_url') /* E */,
  tags: text('tags') /* E */,
  progress_percentage: integer('progress_percentage').notNull().default(0),
  steps: text('steps') /* E */,
  purpose_id: text('purpose_id').references(() => purposes.id, { onDelete: 'set null' }),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  inspiration_url: text('inspiration_url') /* E */,
  deleted_at: integer('deleted_at'),
})

// ============================ GAMIFICATION =================================

export const userProfile = sqliteTable('user_profile', {
  ...baseColumns,
  persona: text('persona'),
  life_stage: text('life_stage'),
  focus_areas: text('focus_areas') /* E */,
  motivation_style: text('motivation_style'),
  display_name: text('display_name') /* E */,
  avatar_url: text('avatar_url') /* E */,
  birth_date: text('birth_date') /* E */,
  timezone: text('timezone').default('UTC'),
  total_xp: integer('total_xp').notNull().default(0),
  current_level: integer('current_level').notNull().default(1),
  check_in_streak: integer('check_in_streak').notNull().default(0),
  longest_check_in_streak: integer('longest_check_in_streak').notNull().default(0),
  last_check_in_date: text('last_check_in_date'),
  onboarding_completed: integer('onboarding_completed').notNull().default(0),
  skipped_modules: text('skipped_modules'),
  active_modules: text('active_modules'),
})

export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  category: text('category').notNull(),
  tier: text('tier').default('bronze'),
  title: text('title').notNull(),
  description: text('description'),
  icon: text('icon'),
  xp_reward: integer('xp_reward').notNull().default(0),
  condition: text('condition'),
  is_secret: integer('is_secret').notNull().default(0),
  created_at: integer('created_at').notNull(),
})

export const userAchievements = sqliteTable('user_achievements', {
  id: text('id').primaryKey(),
  achievement_id: text('achievement_id')
    .notNull()
    .references(() => achievements.id, { onDelete: 'cascade' })
    .unique(),
  earned_at: integer('earned_at').notNull(),
  progress: text('progress'),
  ...syncColumns,
})

export const xpHistory = sqliteTable(
  'xp_history',
  {
    id: text('id').primaryKey(),
    action_type: text('action_type').notNull(),
    xp_amount: integer('xp_amount').notNull(),
    entity_type: text('entity_type'),
    entity_id: text('entity_id'),
    level_before: integer('level_before'),
    level_after: integer('level_after'),
    earned_at: integer('earned_at').notNull(),
    ...syncColumns,
  },
  (t) => [index('idx_xp_history_date').on(t.earned_at)],
)

// ============================ NOTIFICATIONS ================================

export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    title: text('title').notNull() /* E */,
    message: text('message') /* E */,
    action_url: text('action_url'),
    action_label: text('action_label') /* E */,
    entity_type: text('entity_type'),
    entity_id: text('entity_id'),
    is_read: integer('is_read').notNull().default(0),
    read_at: integer('read_at'),
    is_archived: integer('is_archived').notNull().default(0),
    archived_at: integer('archived_at'),
    expires_at: integer('expires_at'),
    created_at: integer('created_at').notNull(),
    ...syncColumns,
  },
  (t) => [index('idx_notifications_unread').on(t.is_read)],
)

// ============================ PREFERENCES ==================================

export const userPreferences = sqliteTable('user_preferences', {
  ...baseColumns,
  theme: text('theme').notNull().default('system'),
  accent_color: text('accent_color').default('#6366f1'),
  date_format: text('date_format').default('YYYY-MM-DD'),
  time_format: text('time_format').default('24h'),
  week_starts_on: integer('week_starts_on').default(1),
  currency: text('currency').default('USD'),
  dashboard_layout: text('dashboard_layout'),
  show_completed_tasks: integer('show_completed_tasks').notNull().default(1),
  default_task_priority: text('default_task_priority').default('medium'),
  pomodoro_work_minutes: integer('pomodoro_work_minutes').notNull().default(25),
  pomodoro_break_minutes: integer('pomodoro_break_minutes').notNull().default(5),
  pomodoro_long_break_minutes: integer('pomodoro_long_break_minutes').notNull().default(15),
  pomodoro_sessions_before_long: integer('pomodoro_sessions_before_long').notNull().default(4),
  notification_email: integer('notification_email').notNull().default(1),
  notification_push: integer('notification_push').notNull().default(1),
  notification_in_app: integer('notification_in_app').notNull().default(1),
  quiet_hours_enabled: integer('quiet_hours_enabled').notNull().default(0),
  quiet_hours_start: text('quiet_hours_start'),
  quiet_hours_end: text('quiet_hours_end'),
  push_habits: integer('push_habits').notNull().default(1),
  push_tasks: integer('push_tasks').notNull().default(1),
  push_routines: integer('push_routines').notNull().default(1),
  push_contacts: integer('push_contacts').notNull().default(1),
  push_study: integer('push_study').notNull().default(1),
  feature_gamification: integer('feature_gamification').notNull().default(1),
})

export const navPreferences = sqliteTable('nav_preferences', {
  ...baseColumns,
  dock_position: text('dock_position').notNull().default('bottom'),
  dock_auto_hide: integer('dock_auto_hide').notNull().default(0),
  dock_size: text('dock_size').notNull().default('medium'),
  mobile_nav_items: text('mobile_nav_items'),
  show_labels: integer('show_labels').notNull().default(1),
  haptic_feedback: integer('haptic_feedback').notNull().default(1),
  reduce_motion: integer('reduce_motion').notNull().default(0),
})

export const commandBarHistory = sqliteTable('command_bar_history', {
  id: text('id').primaryKey(),
  command_key: text('command_key').notNull().unique(),
  command_label: text('command_label').notNull(),
  command_category: text('command_category'),
  use_count: integer('use_count').notNull().default(1),
  last_used_at: integer('last_used_at'),
  is_pinned: integer('is_pinned').notNull().default(0),
  ...syncColumns,
})
