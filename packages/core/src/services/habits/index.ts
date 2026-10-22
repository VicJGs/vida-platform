// services/habits — barrel (mod-habits #49 ①)
export { createHabitsService } from './service'
export { createHabitsJournalContribution, registerHabitsJournal } from './journal'
export {
  HabitScheduleError,
  BackfillWindowError,
  MetricContributionError,
  HABIT_ENTITY_TYPE,
  type HabitsService,
  type HabitsServiceDeps,
  type HabitsPrefsPort,
  type CreateHabitInput,
  type UpdateHabitInput,
  type LogCompletionInput,
  type EditCompletionInput,
  type HabitFilter,
  type HabitDateRange,
  type StreakSummary,
  type CompletionRate,
  type MoodPoint,
  type CalendarDay,
  type HabitGridDay,
  type HabitGridRow,
} from './types'
