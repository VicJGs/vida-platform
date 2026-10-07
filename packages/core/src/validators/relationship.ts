// ============================================================================
// validators/relationship — canonical Zod validators (mod-relationships #56 ① · LIF-137)
//
// Enum schemas (z.enum over the @vida/types tuples — tuple ≡ union ≡ validator ≡
// SQL CHECK, enum-parity.test.ts) + the S1 Contact Create/Update shapes.
//
// FrequencySchema is canonical in ./common — reuse (re-import), never redefine
// (barrel collision, finance.ts:26 precedent). Create makes defaulted/nullable
// columns OPTIONAL (first_name the sole required field — schema notNull floor);
// the service backfills notNull-default columns (relationship_type/interaction_count/
// is_favorite) so create()'s echoed row is faithful (repository-create-returns-input-row).
// Derived stat caches (last_interaction_date/next_contact_date/interaction_count) are
// service-managed → NOT in the input shape. closeness_tier = OPEN vocab (no enum, G4).
// ============================================================================

import { z } from 'zod'
import {
  RELATIONSHIP_TYPE,
  INTERACTION_TYPE,
  SENTIMENT,
  CONTACT_EVENT_TYPE,
  REMINDER_GROUP_ANCHOR,
} from '@vida/types'
import { FrequencySchema, PrioritySchema } from './common'

export const RelationshipTypeSchema = z.enum(RELATIONSHIP_TYPE)
export const InteractionTypeSchema = z.enum(INTERACTION_TYPE)
export const SentimentSchema = z.enum(SENTIMENT)
export const ContactEventTypeSchema = z.enum(CONTACT_EVENT_TYPE)
export const ReminderGroupAnchorSchema = z.enum(REMINDER_GROUP_ANCHOR) // DB-4 #14 (G11)

// --- contacts (REL-01/02/04/05/06 · S1) -------------------------------------
/** social_links typed JSON (C4) — a structured field, NOT tags; stays. */
export const SocialLinksSchema = z.object({
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  whatsapp: z.string().optional(),
})

const ContactFields = z.object({
  first_name: z.string(),
  last_name: z.string().nullable(),
  nickname: z.string().nullable(),
  relationship_type: RelationshipTypeSchema,
  email: z.string().nullable(),
  phone: z.string().nullable(),
  avatar_url: z.string().nullable(),
  company: z.string().nullable(),
  job_title: z.string().nullable(),
  location: z.string().nullable(),
  birthday: z.string().nullable(), // YYYY-MM-DD
  how_we_met: z.string().nullable(), // G8
  social_links: SocialLinksSchema.nullable(), // object in; service stringifies (M1.0 [E]=[])
  closeness_tier: z.string().nullable(), // OPEN vocab, no enum (G4)
  stay_in_touch_frequency: FrequencySchema.nullable(),
  stay_in_touch_days: z.number().int().nullable(),
  is_favorite: z.boolean(),
})
export const CreateContactSchema = ContactFields.partial().extend({
  first_name: z.string(), // the sole required field (schema notNull floor)
})
export const UpdateContactSchema = ContactFields.partial()

export type CreateContactInput = z.infer<typeof CreateContactSchema>
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>
export type SocialLinksInput = z.infer<typeof SocialLinksSchema>

// --- interactions (REL-12…16 · S2) ------------------------------------------
const InteractionFields = z.object({
  contact_id: z.string(),
  interaction_type: InteractionTypeSchema,
  date: z.string(), // YYYY-MM-DD
  duration_minutes: z.number().int().nullable(),
  summary: z.string().nullable(),
  sentiment: SentimentSchema.nullable(),
  follow_up_needed: z.boolean(),
  follow_up_date: z.string().nullable(),
  follow_up_notes: z.string().nullable(),
  energy_given: z.number().int().nullable(), // G8 analytic
  energy_received: z.number().int().nullable(), // G8 analytic
  key_takeaways: z.string().nullable(), // G8 [E]
})
export const CreateInteractionSchema = InteractionFields.partial().extend({
  contact_id: z.string(), // required — the owning contact (notNull)
  date: z.string(), // required (notNull)
})
// contact_id is NOT patchable — an interaction never migrates contacts.
export const UpdateInteractionSchema = InteractionFields.omit({ contact_id: true }).partial()

export type LogInteractionInput = z.infer<typeof CreateInteractionSchema>
export type UpdateInteractionInput = z.infer<typeof UpdateInteractionSchema>

// --- contact_events (REL-26 · S3) -------------------------------------------
const EventFields = z.object({
  contact_id: z.string(),
  event_type: ContactEventTypeSchema,
  event_date: z.string(), // YYYY-MM-DD or MM-DD (year-agnostic recurring, RL-8)
  title: z.string().nullable(),
  description: z.string().nullable(),
  is_recurring: z.boolean(),
  reminder_days: z.array(z.number().int()).nullable(), // JSON [1,3,7]; service serializes
})
export const CreateEventSchema = EventFields.partial().extend({
  contact_id: z.string(), // required (notNull)
  event_date: z.string(), // required (notNull)
})
export type CreateEventInput = z.infer<typeof CreateEventSchema>

// --- contact_reminders (REL-30 · S4) ----------------------------------------
const ReminderFields = z.object({
  contact_id: z.string(),
  reminder_group_id: z.string().nullable(),
  title: z.string(),
  reminder_date: z.string().nullable(), // YYYY-MM-DD
  is_recurring: z.boolean(),
  frequency: FrequencySchema.nullable(),
  priority: PrioritySchema.nullable(), // G8
})
export const CreateReminderSchema = ReminderFields.partial().extend({
  contact_id: z.string(), // required (notNull)
  title: z.string(), // required (notNull)
})
export type CreateReminderInput = z.infer<typeof CreateReminderSchema>

// --- reminder_groups (REL-39 · S4) ------------------------------------------
const GroupFields = z.object({
  name: z.string(),
  message_template: z.string().nullable(),
  time_of_day: z.string().nullable(), // HH:MM
  frequency: FrequencySchema.nullable(),
  days_of_week: z.array(z.number().int()).nullable(), // [0-6]; service serializes
  anchor_type: ReminderGroupAnchorSchema,
  anchor_days_before: z.number().int().nullable(),
})
export const CreateGroupSchema = GroupFields.partial().extend({
  name: z.string(), // required (notNull)
})
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>
