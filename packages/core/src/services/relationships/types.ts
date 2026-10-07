// services/relationships — types (mod-relationships #56 · LIF-137 ①)
//
// createRelationshipsService over DB-4 025_relationships (8 tables) — the PII-heaviest module.
// Composes the built foundation substrates (spaces · notes · journal · sessions/dueIn · ingestion ·
// notifications-delivery) per slice; does not re-implement them. Built PER SLICE (Entity Delivery Flow);
// S1 = contact CRUD spine + DB-11 @vida/types reconcile.
//
// Deps GROW per slice (purposes/projects precedent): S1 = { db, deviceId }; later slices widen
// (S4 sessions for the dueIn seam; S7 ingestion?; S8 spaces/notes; S9 journal/effects?/tasks?/gamification?).
// Reads return a VIEW type (ContactView) — social_links is parsed JSON, NOT the raw Drizzle Row
// ([[drizzle-row-not-assignable-to-vida-types-interface]] · [[json-t-columns-need-service-serialize-in-m10]]).

import type { DrizzleDb } from '../../db/adapter'
import type { RelationshipType, SocialLinks } from '@vida/types'
import type {
  ContactRow,
  InteractionRow,
  ContactEventRow,
  ContactReminderRow,
  ReminderGroupRow,
} from '../../db/schema/relationships'
import type {
  CreateContactInput,
  UpdateContactInput,
  LogInteractionInput,
  UpdateInteractionInput,
  CreateEventInput,
  CreateReminderInput,
  CreateGroupInput,
} from '../../validators/relationship'
import type { TimeRange, DueItem } from '../sessions'

/** A contact as returned by the service: the Drizzle Row with `social_links` parsed to the object (BR-RL-S1-4b).
 *  The `text()` column stores JSON (M1.0 [E]=[]); the service owns the serialize/parse boundary. */
export type ContactView = Omit<ContactRow, 'social_links'> & { social_links: SocialLinks | null }

/** Filter for `listContacts` (active-only; applied in JS over findAll — the findWhere soft-delete trap). */
export interface ListContactsFilter {
  relationship_type?: RelationshipType
  is_favorite?: boolean
}

/** A contact_event with `reminder_days` parsed from JSON (S3 view boundary, like ContactView). */
export type EventView = Omit<ContactEventRow, 'reminder_days'> & { reminder_days: number[] | null }

/** An inclusive calendar-date range (YYYY-MM-DD) for `getUpcomingEvents`. */
export interface EventDateRange {
  from: string
  to: string
}

/** An event + its concrete next-occurrence date inside the queried range (S3; recurring MM-DD projected to a year). */
export interface UpcomingEvent {
  event: EventView
  occurrence: string
}

/** A reminder_group with `days_of_week` parsed from JSON (S4 view boundary). */
export type ReminderGroupView = Omit<ReminderGroupRow, 'days_of_week'> & { days_of_week: number[] | null }

export interface RelationshipsServiceDeps {
  db: DrizzleDb
  deviceId: string
}

export interface RelationshipsService {
  // --- S1: contact spine (REL-01…06) ---------------------------------------
  createContact(input: CreateContactInput): Promise<ContactView>
  updateContact(id: string, patch: UpdateContactInput): Promise<ContactView>
  softDeleteContact(id: string): Promise<void>
  listContacts(filter?: ListContactsFilter): Promise<ContactView[]>
  getContact(id: string): Promise<ContactView | null>
  toggleFavorite(id: string): Promise<ContactView>

  // --- S2: interactions ledger + derived contact stats (REL-12…16) ---------
  logInteraction(input: LogInteractionInput): Promise<InteractionRow>
  updateInteraction(id: string, patch: UpdateInteractionInput): Promise<InteractionRow>
  deleteInteraction(id: string): Promise<void>
  getTimeline(contactId: string): Promise<InteractionRow[]>

  // --- S3: events (REL-26…29) ----------------------------------------------
  createEvent(input: CreateEventInput): Promise<EventView>
  getUpcomingEvents(range: EventDateRange): Promise<UpcomingEvent[]>
  getAllEvents(): Promise<EventView[]>

  // --- S4: reminders + groups + dueIn producer (REL-30…42) -----------------
  createReminder(input: CreateReminderInput): Promise<ContactReminderRow>
  completeReminder(id: string): Promise<ContactReminderRow>
  snoozeReminder(id: string, until: string): Promise<ContactReminderRow>
  createGroup(input: CreateGroupInput): Promise<ReminderGroupView>
  addMembers(groupId: string, contactIds: string[]): Promise<void>
  removeMembers(groupId: string, contactIds: string[]): Promise<void>
  setBirthdayAnchor(groupId: string, daysBefore: number): Promise<ReminderGroupView>
  deleteGroup(groupId: string): Promise<void>
  /** The R7 `dueIn` producer seam — Notifications' dispatcher + Calendar + Journal read it (S9 registers the lane). */
  getDueReminders(range: TimeRange): Promise<DueItem[]>
}

/** A contact id did not resolve to a live (non-soft-deleted) contact (REL-02/06; preflight G1). */
export class ContactNotFoundError extends Error {
  constructor(id: string) {
    super(`Contact not found: ${id}`)
    this.name = 'ContactNotFoundError'
  }
}

/** An interaction id did not resolve (REL-13/14 · S2). */
export class InteractionNotFoundError extends Error {
  constructor(id: string) {
    super(`Interaction not found: ${id}`)
    this.name = 'InteractionNotFoundError'
  }
}

/** A contact_reminder id did not resolve (REL-31/32 · S4). */
export class ReminderNotFoundError extends Error {
  constructor(id: string) {
    super(`Reminder not found: ${id}`)
    this.name = 'ReminderNotFoundError'
  }
}

/** A reminder_group id did not resolve (REL-40/41 · S4). */
export class ReminderGroupNotFoundError extends Error {
  constructor(id: string) {
    super(`Reminder group not found: ${id}`)
    this.name = 'ReminderGroupNotFoundError'
  }
}
