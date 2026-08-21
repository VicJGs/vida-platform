import { z } from 'zod'
import {
  RELATIONSHIP_TYPE,
  INTERACTION_TYPE,
  SENTIMENT,
  CONTACT_EVENT_TYPE,
  REMINDER_GROUP_ANCHOR,
} from '@vida/types'

export const RelationshipTypeSchema = z.enum(RELATIONSHIP_TYPE)
export const InteractionTypeSchema = z.enum(INTERACTION_TYPE)
export const SentimentSchema = z.enum(SENTIMENT)
export const ContactEventTypeSchema = z.enum(CONTACT_EVENT_TYPE)
export const ReminderGroupAnchorSchema = z.enum(REMINDER_GROUP_ANCHOR) // DB-4 #14 (G11)
