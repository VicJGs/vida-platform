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
  NetworkGroupRow,
} from '../../db/schema/relationships'
import type {
  CreateContactInput,
  UpdateContactInput,
  LogInteractionInput,
  UpdateInteractionInput,
  CreateEventInput,
  CreateReminderInput,
  CreateGroupInput,
  CreateNetworkInput,
} from '../../validators/relationship'
import type { TimeRange, DueItem } from '../sessions'
import type { SpacesService } from '../../foundation/spaces'
import type { EntityTagRow } from '../../db/schema/foundation/spaces'
import type { NotesService } from '../notes'
import type { PageRow } from '../../db/schema/notes'

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

/** A neural-graph node (S5) — a contact or a network. */
export interface GraphNode {
  id: string
  kind: 'contact' | 'network'
  label: string
}
/** A membership edge (S5) — contact → network. No contact↔contact edges (RL-4). */
export interface GraphEdge {
  source: string
  target: string
}
/** The network⇄contact membership graph, Sigma-ready (REL-46). */
export interface NetworkGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/** Relationship-health band (S6, RL-5) — a derived analytic, NOT an ADR-011 measurement (C1). */
export type HealthBand = 'new' | 'healthy' | 'at_risk' | 'overdue'

/** The inputs that produced a health band (transparency — why this score). */
export interface HealthFactors {
  daysOverdue: number
  tracked: boolean
  closenessWeight: number
  recentSentiment: number | null
}

/** A contact's derived health (REL-22/23/24). `score` null for `new`; `partial` flags a degraded compute (REL-24). */
export interface ContactHealth {
  band: HealthBand
  score: number | null
  factors: HealthFactors
  partial?: boolean
}

/** A network's rolled-up health (REL-47) — worst member band + mean member score + per-band counts. */
export interface NetworkHealth {
  band: HealthBand
  score: number | null
  memberCount: number
  factors: Record<HealthBand, number>
}

// --- S7: device import (X1/X8, deny-safe) -----------------------------------
/** A device-parsed contact row (the device did the on-device parse/normalize/encrypt — X1; no server-plaintext). */
export interface RawContact {
  sourceRowId: string
  first_name: string
  last_name?: string | null
  email?: string | null
  phone?: string | null
  company?: string | null
}
export type ImportRowStatus = 'new' | 'matched' | 'parse_error'
/** A staged (parsed-but-uncommitted) import row + its match metadata (X8 — never auto-committed). */
export interface StagedContact {
  sourceRowId: string
  raw: RawContact
  status: ImportRowStatus
  matchId?: string
  error?: string
}
export interface ContactImportResult {
  staged: StagedContact[]
}
export interface ContactCommitResult {
  created: string[]
  matched: string[]
  skipped: string[]
}
/** The deny-safe device seam (X1) — M2 supplies the real on-device bridge; absent at M1 ⇒ ContactsPermissionError. */
export interface DeviceContactsPort {
  readContacts(): Promise<RawContact[]>
}

/** The day's relationship activity for the Journal `/summary` recap (REL-53 · S9). */
export interface RelationshipsDayDigest {
  interactionsToday: number
  eventsToday: number
  remindersDue: number
}

export interface RelationshipsServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** REQUIRED (S8) — the entity_tags + entity_links WRITE surface (ADR-006). Relationships delegates ALL tag writes
   *  here (read/write split); spaces validates entity_type against the shared registry (contact/network seeded). */
  spaces: SpacesService
  /** REQUIRED (S8) — the `pages` surface for standalone contact/network notes (G9). */
  notes: NotesService
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

  // --- S5: networks + neural-graph data-prep (REL-43…46) -------------------
  createNetwork(input: CreateNetworkInput): Promise<NetworkGroupRow>
  addToNetwork(networkId: string, contactId: string): Promise<void>
  removeFromNetwork(networkId: string, contactId: string): Promise<void>
  getNetworkGraph(): Promise<NetworkGraph>

  // --- S6: derived health engine (REL-22…25, 47) — NOT a measurement (C1) --
  getContactHealth(id: string, asOf?: string): Promise<ContactHealth>
  getNetworkHealth(networkId: string, asOf?: string): Promise<NetworkHealth>

  // --- S7: device import (REL-07…11, deny-safe X1/X8) ----------------------
  importDeviceContacts(device?: DeviceContactsPort): Promise<ContactImportResult>
  commitContactImport(staged: StagedContact[]): Promise<ContactCommitResult>

  // --- S8: tags (entity_tags) + pages + links (REL-48/49/50) ---------------
  tagContact(contactId: string, tagId: string): Promise<EntityTagRow>
  untagContact(contactId: string, tagId: string): Promise<void>
  tagNetwork(networkId: string, tagId: string): Promise<EntityTagRow>
  untagNetwork(networkId: string, tagId: string): Promise<void>
  ensureContactNote(contactId: string): Promise<PageRow>
  ensureNetworkNote(networkId: string): Promise<PageRow>

  // --- S9: Journal /summary digest (REL-53) — PULL (register helpers in journal.ts) ---
  getDayRelationshipsDigest(date: string): Promise<RelationshipsDayDigest>
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

/** A network_group id did not resolve (REL-44 · S5). */
export class NetworkNotFoundError extends Error {
  constructor(id: string) {
    super(`Network not found: ${id}`)
    this.name = 'NetworkNotFoundError'
  }
}

/** Device-contact import attempted without a device port / permission (REL-10 · S7) — no partial silent import. */
export class ContactsPermissionError extends Error {
  constructor() {
    super('Device contacts unavailable or permission denied')
    this.name = 'ContactsPermissionError'
  }
}
