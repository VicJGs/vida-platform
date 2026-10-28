// ============================================================================
// mod-check-ins #41 · S1 — check-ins entity object validators (CHE-18/19)
//
// The enum tuple↔schema parity is covered by enum-parity.test.ts + enums.test.ts.
// This proves the OBJECT schemas: shape mirrors the interfaces (entities/user.ts:128-180),
// scale bounds (CHE-19), required-field partitions, and the .partial() patch idiom.
// Colocated per the enums.test.ts convention (no validators/__tests__ dir; object validators
// are otherwise proven via their service consumer — S1 has none yet, so this closes S1's gate).
// ============================================================================

import { describe, it, expect } from 'vitest'
import {
  DailyCheckInFields,
  CreateCheckInSchema,
  UpdateCheckInSchema,
  CheckInTemplateFields,
  CreateTemplateSchema,
  AddQuestionSchema,
  ScheduleConfigSchema,
} from './user'

const validDaily = {
  check_in_date: '2026-09-19',
  check_in_type: 'morning' as const,
  template_id: null,
  mood_score: 7,
  energy_level: 5,
  top_intentions: ['ship S1'],
  wins: [],
  gratitude: ['coffee'],
  challenges: [],
  tomorrow_focus: [],
  reflection: null,
  custom_data: null,
}

describe('DailyCheckInFields', () => {
  it('accepts a valid check-in row', () => {
    expect(DailyCheckInFields.safeParse(validDaily).success).toBe(true)
  })
  it('rejects mood_score out of 1-10 range (CHE-19)', () => {
    expect(DailyCheckInFields.safeParse({ ...validDaily, mood_score: 11 }).success).toBe(false)
    expect(DailyCheckInFields.safeParse({ ...validDaily, energy_level: 0 }).success).toBe(false)
  })
  it('rejects an unknown check_in_type', () => {
    expect(DailyCheckInFields.safeParse({ ...validDaily, check_in_type: 'nightly' }).success).toBe(false)
  })
})

describe('CreateCheckInSchema', () => {
  it('accepts just the required slot keys (rest service-defaulted)', () => {
    expect(CreateCheckInSchema.safeParse({ check_in_date: '2026-09-19', check_in_type: 'evening' }).success).toBe(true)
  })
  it('rejects a create missing the slot keys (CHE-01)', () => {
    expect(CreateCheckInSchema.safeParse({ mood_score: 5 }).success).toBe(false)
    expect(CreateCheckInSchema.safeParse({ check_in_date: '2026-09-19' }).success).toBe(false)
  })
})

describe('UpdateCheckInSchema', () => {
  it('accepts an empty patch and a partial patch (.partial idiom)', () => {
    expect(UpdateCheckInSchema.safeParse({}).success).toBe(true)
    expect(UpdateCheckInSchema.safeParse({ reflection: 'good day' }).success).toBe(true)
  })
  it('still enforces bounds on a patched field', () => {
    expect(UpdateCheckInSchema.safeParse({ mood_score: 99 }).success).toBe(false)
  })
})

describe('CheckInTemplateFields / CreateTemplateSchema', () => {
  const validTemplate = {
    name: 'Morning',
    description: null,
    icon: 'sun',
    is_default: true,
    is_active: true,
    schedule_type: 'daily' as const,
    schedule_days: [1, 2, 3],
    preferred_time: 'morning' as const,
    sort_order: 0,
  }
  it('accepts a valid template', () => {
    expect(CheckInTemplateFields.safeParse(validTemplate).success).toBe(true)
  })
  it('rejects schedule_days outside 0-6', () => {
    expect(CheckInTemplateFields.safeParse({ ...validTemplate, schedule_days: [7] }).success).toBe(false)
  })
  it('create requires only name', () => {
    expect(CreateTemplateSchema.safeParse({ name: 'Evening' }).success).toBe(true)
    expect(CreateTemplateSchema.safeParse({ icon: 'moon' }).success).toBe(false)
  })
})

describe('AddQuestionSchema (CHE-08)', () => {
  const validQ = {
    field_key: 'sleep_quality',
    label: 'How did you sleep?',
    field_type: 'rating' as const,
    placeholder: null,
    is_required: false,
    min_value: 1,
    max_value: 5,
    sort_order: 0,
  }
  it('accepts a valid question', () => {
    expect(AddQuestionSchema.safeParse(validQ).success).toBe(true)
  })
  it('rejects an empty field_key (UNIQUE key must be non-empty)', () => {
    expect(AddQuestionSchema.safeParse({ ...validQ, field_key: '' }).success).toBe(false)
  })
  it('rejects an unknown field_type', () => {
    expect(AddQuestionSchema.safeParse({ ...validQ, field_type: 'slider' }).success).toBe(false)
  })
  it('accepts core fields only (rest optional)', () => {
    expect(AddQuestionSchema.safeParse({ field_key: 'k', label: 'L', field_type: 'boolean' }).success).toBe(true)
  })
})

describe('ScheduleConfigSchema (CHE-11)', () => {
  it('accepts a valid schedule config', () => {
    expect(
      ScheduleConfigSchema.safeParse({ schedule_type: 'weekly', schedule_days: [0, 6], preferred_time: 'evening' })
        .success,
    ).toBe(true)
  })
  it('accepts null config fields (nullable)', () => {
    expect(
      ScheduleConfigSchema.safeParse({ schedule_type: null, schedule_days: null, preferred_time: null }).success,
    ).toBe(true)
  })
  it('rejects an invalid preferred_time', () => {
    expect(
      ScheduleConfigSchema.safeParse({ schedule_type: null, schedule_days: null, preferred_time: 'noon' }).success,
    ).toBe(false)
  })
})
