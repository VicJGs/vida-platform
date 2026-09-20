// services/checkins — barrel (mod-check-ins #41 ①)
export { createCheckInsService, computeStreak } from './service'
export {
  DuplicateCheckInError,
  DuplicateFieldKeyError,
  RequiredQuestionUnansweredError,
  StandardFieldInCustomDataError,
  type CheckInsService,
  type CheckInsServiceDeps,
  type CreateCheckInInput,
  type UpdateCheckInInput,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type AddQuestionInput,
  type ScheduleConfigInput,
  type MoodEnergyPoint,
  type MoodEnergyTrend,
  type StreakResult,
  type JournalLinkPort,
  type EffectsPort,
  type CheckInReviewData,
} from './types'
