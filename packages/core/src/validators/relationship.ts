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
import { FrequencySchema } from './common'

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
