// services/relationships — service (mod-relationships #56 · LIF-137 ①)
//
// createRelationshipsService over DB-4 025_relationships. Built PER SLICE (Entity Delivery Flow);
// S1 = contact CRUD spine (REL-01…06) + enum validation (REL-17) + social_links JSON boundary (REL-58).
//
// Patterns (precedent: services/purposes · services/projects):
// - factory → object literal; intra-service calls hoist to closures, NOT `this.` [[factory-service-no-this]].
// - Repository.create() RETURNS THE INPUT ROW (not DB defaults) → backfill NN-default cols in the create input
//   (relationship_type/interaction_count/is_favorite) [[repository-create-returns-input-row-not-db-defaults]].
// - findWhere skips the soft-delete filter → list active via findAll [[repository-findwhere-skips-softdelete-filter]].
// - M1.0 encryptedFields:[] (the [E] PII passes through; real field encryption = M3) [[m10-repos-use-empty-encryptedfields-seam]].
// - social_links is a text() column holding JSON (M1.0 [E]=[]) → service serialize/parse boundary
//   [[json-t-columns-need-service-serialize-in-m10]]; reads return a ContactView (not the raw Row).

import { eq, and, type SQL } from 'drizzle-orm'
import type { SocialLinks, RelationshipType, Frequency, Sentiment } from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import {
  contacts,
  contactEvents,
  interactions,
  contactReminders,
  reminderGroups,
  reminderGroupContacts,
  networkGroups,
  networkGroupContacts,
  type ContactRow,
  type ContactEventRow,
  type ReminderGroupRow,
} from '../../db/schema/relationships'
import {
  CreateContactSchema,
  UpdateContactSchema,
  CreateInteractionSchema,
  UpdateInteractionSchema,
  CreateEventSchema,
  CreateReminderSchema,
  CreateGroupSchema,
  CreateNetworkSchema,
} from '../../validators/relationship'
import type { DueItem } from '../sessions'
import {
  type RelationshipsService,
  type RelationshipsServiceDeps,
  type ContactView,
  type EventView,
  type UpcomingEvent,
  type ReminderGroupView,
  type GraphNode,
  type GraphEdge,
  type ContactHealth,
  type HealthBand,
  type RawContact,
  type StagedContact,
  ContactNotFoundError,
  InteractionNotFoundError,
  ReminderNotFoundError,
  ReminderGroupNotFoundError,
  NetworkNotFoundError,
  ContactsPermissionError,
} from './types'
import type { CreateContactInput } from '../../validators/relationship'

// --- S7: contact-import natural-key matcher (X8; pure, device-shape-agnostic) ---
/** The existing-contact fields the matcher compares (ContactRow satisfies this). */
interface MatchableContact {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
}
/** Stage device-parsed rows against existing contacts (X8 reconcile): natural-key match (email/phone/exact-name),
 *  `parse_error` on a missing name, else `new`. Pure — never writes, never overwrites. */
export function stageContacts(incoming: RawContact[], existing: MatchableContact[]): StagedContact[] {
  return incoming.map((raw) => {
    if (!raw.first_name || raw.first_name.trim() === '') {
      return { sourceRowId: raw.sourceRowId, raw, status: 'parse_error', error: 'missing first_name' }
    }
    const match = existing.find(
      (e) =>
        (raw.email != null && e.email != null && e.email.toLowerCase() === raw.email.toLowerCase()) ||
        (raw.phone != null && e.phone != null && e.phone === raw.phone) ||
        (e.first_name === raw.first_name && (e.last_name ?? '') === (raw.last_name ?? '')),
    )
    return match
      ? { sourceRowId: raw.sourceRowId, raw, status: 'matched', matchId: match.id }
      : { sourceRowId: raw.sourceRowId, raw, status: 'new' }
  })
}

// --- health-engine constants (S6; derived analytic, NOT a measurement — C1) -
/** Closeness "onion" weight by relationship_type — inner tiers penalize neglect more (REL-25). */
const TYPE_WEIGHT: Record<RelationshipType, number> = {
  family: 2.0,
  romantic: 2.0,
  mentor: 1.5,
  mentee: 1.5,
  friend: 1.5,
  colleague: 1.0,
  professional: 1.0,
  acquaintance: 0.75,
  other: 0.75,
}
const closenessWeight = (type: RelationshipType, favorite: boolean): number =>
  TYPE_WEIGHT[type] + (favorite ? 0.5 : 0)
const SENTIMENT_SCORE: Record<Sentiment, number> = { positive: 1, neutral: 0, negative: -1 }
const BAND_RANK: Record<HealthBand, number> = { new: 0, healthy: 1, at_risk: 2, overdue: 3 }
/** Whole days from `a` to `b` (both YYYY-MM-DD; UTC-day-parsed). */
const daysBetweenISO = (a: string, b: string): number =>
  Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))

// --- derived-stats helpers (RL-3; S2) ---------------------------------------
// frequency → approximate day-count; stay_in_touch_days is the exact override (precedence).
const FREQ_DAYS: Record<Frequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
}
const frequencyToDays = (f: Frequency | null | undefined): number | null => (f ? FREQ_DAYS[f] : null)
/** `iso` (YYYY-MM-DD) + n days, UTC-day-parsed so the diff is TZ-consistent (books addDaysISO precedent). */
const addDaysISO = (iso: string, n: number): string =>
  new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)

// --- event-occurrence helpers (RL-8; S3) ------------------------------------
/** The MM-DD of an event date (whether stored as `YYYY-MM-DD` or already `MM-DD`). */
const mmdd = (date: string): string => (date.length >= 10 ? date.slice(5) : date)
/** The first `YYYY-${md}` occurrence on/after `from` (wraps to next year if this year's has passed). */
const nextOccurrence = (md: string, from: string): string => {
  const year = from.slice(0, 4)
  const candidate = `${year}-${md}`
  return candidate >= from ? candidate : `${Number(year) + 1}-${md}`
}

// --- dueIn window helpers (S4) ----------------------------------------------
/** Unix ms → UTC-day YYYY-MM-DD (the dueIn window bound as a calendar day). */
const msToISO = (ms: number): string => new Date(ms).toISOString().slice(0, 10)
/** YYYY-MM-DD → Unix ms at UTC midnight (the DueItem due moment). */
const isoToMs = (iso: string): number => Date.parse(iso + 'T00:00:00Z')
/** UTC weekday (0=Sun..6=Sat) of a YYYY-MM-DD. */
const isoWeekday = (iso: string): number => new Date(iso + 'T00:00:00Z').getUTCDay()

export function createRelationshipsService(deps: RelationshipsServiceDeps): RelationshipsService {
  const { db, deviceId } = deps

  // contacts is the only soft-delete table (§5.9 floor); children/junctions hard-delete on cascade (RL-2).
  const contactsRepo = createRepository(db, contacts, { encryptedFields: [], deviceId, softDelete: true })
  const eventsRepo = createRepository(db, contactEvents, { encryptedFields: [], deviceId })
  const interactionsRepo = createRepository(db, interactions, { encryptedFields: [], deviceId })
  const remindersRepo = createRepository(db, contactReminders, { encryptedFields: [], deviceId })
  const reminderGroupsRepo = createRepository(db, reminderGroups, { encryptedFields: [], deviceId })
  const reminderGroupContactsRepo = createRepository(db, reminderGroupContacts, { encryptedFields: [], deviceId })
  const networkGroupsRepo = createRepository(db, networkGroups, { encryptedFields: [], deviceId })
  const networkGroupContactsRepo = createRepository(db, networkGroupContacts, { encryptedFields: [], deviceId })

  // --- social_links JSON boundary (BR-RL-S1-4) -------------------------------
  const serializeLinks = (v: SocialLinks | null | undefined): string | null =>
    v != null ? JSON.stringify(v) : null
  function toView(row: ContactRow): ContactView {
    const { social_links, ...rest } = row
    return { ...rest, social_links: social_links != null ? (JSON.parse(social_links) as SocialLinks) : null }
  }
  function toEventView(row: ContactEventRow): EventView {
    const { reminder_days, ...rest } = row
    return { ...rest, reminder_days: reminder_days != null ? (JSON.parse(reminder_days) as number[]) : null }
  }
  function toGroupView(row: ReminderGroupRow): ReminderGroupView {
    const { days_of_week, ...rest } = row
    return { ...rest, days_of_week: days_of_week != null ? (JSON.parse(days_of_week) as number[]) : null }
  }

  // --- intra-service closures (hoisted, not `this.`) -------------------------
  async function getContact(id: string): Promise<ContactView | null> {
    const row = await contactsRepo.findById(id) // soft-delete-aware (isNull(deleted_at))
    return row ? toView(row) : null
  }
  /** Hoisted so S7 commitContactImport reuses the exact create path (backfill + social_links + re-read), not `this.`. */
  async function createContactImpl(input: CreateContactInput): Promise<ContactView> {
    const parsed = CreateContactSchema.parse(input) // async → ZodError rejects (not sync throw)
    const { social_links, ...rest } = parsed
    const row: CreateInput<typeof contacts> = {
      ...rest,
      first_name: parsed.first_name,
      relationship_type: parsed.relationship_type ?? 'acquaintance', // backfill NN-default (echoed row faithful)
      interaction_count: 0,
      is_favorite: parsed.is_favorite ?? false,
      social_links: serializeLinks(social_links),
    }
    const created = await contactsRepo.create(row)
    // create() echoes the INPUT row → omitted nullable cols come back undefined, not the DB null
    // ([[repository-create-returns-input-row-not-db-defaults]]). Re-read for a faithful ContactView.
    const view = await getContact(created.id)
    if (!view) throw new Error(`Contact vanished after create: ${created.id}`)
    return view
  }

  /** App-layer cascade (RL-2, no-FK): hard-delete every child/junction keyed on contact_id. Defensive + idempotent
   *  (critic advisory #1 — all 8 tables exist at S1, so the cascade is complete now). */
  async function purgeChildren(id: string): Promise<void> {
    const kill = async (
      repo: { findWhere(w: SQL): Promise<{ id: string }[]>; hardDelete(rowId: string): Promise<void> },
      where: SQL,
    ): Promise<void> => {
      const rows = await repo.findWhere(where)
      for (const r of rows) await repo.hardDelete(r.id)
    }
    await kill(eventsRepo, eq(contactEvents.contact_id, id))
    await kill(interactionsRepo, eq(interactions.contact_id, id))
    await kill(remindersRepo, eq(contactReminders.contact_id, id))
    await kill(reminderGroupContactsRepo, eq(reminderGroupContacts.contact_id, id))
    await kill(networkGroupContactsRepo, eq(networkGroupContacts.contact_id, id))
  }

  // --- S6: derived health engine (REL-22…25/47; hoisted so getNetworkHealth reuses it, not `this.`) ---
  /** Mean sentiment of a contact's last 5 rated interactions (positive +1/neutral 0/negative −1); null if none. */
  async function recentSentiment(contactId: string): Promise<number | null> {
    const rows = await interactionsRepo.findWhere(eq(interactions.contact_id, contactId))
    const rated = rows
      .filter((r) => r.sentiment != null)
      // date desc, created_at desc tiebreak — the getTimeline convention (deterministic window, g2 S6 note)
      .sort((a, b) => (a.date === b.date ? b.created_at - a.created_at : a.date < b.date ? 1 : -1))
      .slice(0, 5)
    if (rated.length === 0) return null
    const sum = rated.reduce((s, r) => s + SENTIMENT_SCORE[r.sentiment as Sentiment], 0)
    return sum / rated.length
  }
  async function computeContactHealth(id: string, asOf?: string): Promise<ContactHealth> {
    const c = await contactsRepo.findById(id)
    if (!c) throw new ContactNotFoundError(id)
    const weight = closenessWeight(c.relationship_type as RelationshipType, Boolean(c.is_favorite))
    const tracked = c.next_contact_date != null
    if (c.interaction_count === 0) {
      // no baseline → `new`, never "overdue" (REL-23)
      return { band: 'new', score: null, factors: { daysOverdue: 0, tracked, closenessWeight: weight, recentSentiment: null } }
    }
    const today = asOf ?? new Date(Date.now()).toISOString().slice(0, 10)
    const daysOverdue = c.next_contact_date != null ? Math.max(0, daysBetweenISO(c.next_contact_date, today)) : 0
    const sentiment = await recentSentiment(id)
    const raw = Math.round(100 - daysOverdue * weight * 1.5 + (sentiment ?? 0) * 15)
    const factors = { daysOverdue, tracked, closenessWeight: weight, recentSentiment: sentiment }
    if (!Number.isFinite(raw)) return { band: 'new', score: null, factors, partial: true } // REL-24 fail-loud
    const score = clamp(raw, 0, 100)
    const negative = sentiment != null && sentiment < 0
    const band: HealthBand = !tracked
      ? negative ? 'at_risk' : 'healthy' // untracked → sentiment-only, never overdue
      : daysOverdue === 0
        ? negative ? 'at_risk' : 'healthy'
        : daysOverdue <= Math.ceil(7 / weight) // grace — shorter for inner tiers (onion)
          ? 'at_risk'
          : 'overdue'
    return { band, score, factors }
  }

  // --- S2: derived contact stats recompute (REL-19/20/21, RL-3) --------------
  /** Recompute the contact's denormalized stat cache from the interactions ledger (never hand-maintained).
   *  Pure over the ledger + the contact's cadence; null-guards a vanished contact (defensive no-op). */
  async function recomputeContactStats(contactId: string): Promise<void> {
    const contact = await contactsRepo.findById(contactId)
    if (!contact) return // a live interaction always has a live contact (cascade) — defensive
    const rows = await interactionsRepo.findWhere(eq(interactions.contact_id, contactId))
    const interaction_count = rows.length
    const last_interaction_date = rows.length
      ? rows.reduce((max, r) => (r.date > max ? r.date : max), rows[0].date) // MAX date (ISO lexicographic = chrono)
      : null
    const cadenceDays =
      contact.stay_in_touch_days ?? frequencyToDays(contact.stay_in_touch_frequency as Frequency | null)
    const next_contact_date =
      last_interaction_date != null && cadenceDays != null ? addDaysISO(last_interaction_date, cadenceDays) : null
    await contactsRepo.update(contactId, { last_interaction_date, next_contact_date, interaction_count })
  }

  return {
    // --- REL-01 createContact ------------------------------------------------
    createContact: (input) => createContactImpl(input),

    // --- REL-02 updateContact ------------------------------------------------
    updateContact: async (id, patch) => {
      const cur = await getContact(id) // soft-delete-aware guard (preflight G1)
      if (!cur) throw new ContactNotFoundError(id)
      const parsed = UpdateContactSchema.parse(patch)
      const { social_links, ...rest } = parsed
      const data: UpdateInput<typeof contacts> = { ...rest }
      if ('social_links' in parsed) data.social_links = serializeLinks(social_links)
      const updated = await contactsRepo.update(id, data)
      return toView(updated)
    },

    // --- REL-03 softDeleteContact (cascade, RL-2) ----------------------------
    softDeleteContact: async (id) => {
      const existing = await contactsRepo.findById(id) // soft-delete-aware → null if missing/already-deleted
      if (!existing) return // idempotent no-op (children already purged on the first delete)
      await contactsRepo.delete(id) // soft (sets deleted_at; row still syncs)
      await purgeChildren(id)
    },

    // --- REL-04 listContacts (active-only + JS filter) -----------------------
    listContacts: async (filter) => {
      const all = await contactsRepo.findAll() // applies isNull(deleted_at) — NOT findWhere (soft-delete trap)
      const matched = all.filter(
        (c) =>
          (filter?.relationship_type === undefined ||
            (c.relationship_type as RelationshipType) === filter.relationship_type) &&
          (filter?.is_favorite === undefined || Boolean(c.is_favorite) === filter.is_favorite),
      )
      return matched.map(toView)
    },

    // --- REL-05 getContact ---------------------------------------------------
    getContact,

    // --- REL-06 toggleFavorite -----------------------------------------------
    toggleFavorite: async (id) => {
      const cur = await getContact(id) // soft-delete-aware guard (preflight G1)
      if (!cur) throw new ContactNotFoundError(id)
      const updated = await contactsRepo.update(id, { is_favorite: !cur.is_favorite })
      return toView(updated)
    },

    // --- REL-12 logInteraction (append ledger + recompute stats) -------------
    logInteraction: async (input) => {
      const parsed = CreateInteractionSchema.parse(input)
      const contact = await contactsRepo.findById(parsed.contact_id) // soft-delete-aware guard
      if (!contact) throw new ContactNotFoundError(parsed.contact_id)
      const row: CreateInput<typeof interactions> = {
        ...parsed,
        interaction_type: parsed.interaction_type ?? 'in_person', // NN-default backfill
        follow_up_needed: parsed.follow_up_needed ?? false, // NN-default backfill
      }
      const created = await interactionsRepo.create(row)
      await recomputeContactStats(parsed.contact_id)
      const persisted = await interactionsRepo.findById(created.id) // re-read → faithful nulls
      if (!persisted) throw new Error(`Interaction vanished after create: ${created.id}`)
      return persisted
    },

    // --- REL-13 updateInteraction --------------------------------------------
    updateInteraction: async (id, patch) => {
      const existing = await interactionsRepo.findById(id)
      if (!existing) throw new InteractionNotFoundError(id)
      const parsed = UpdateInteractionSchema.parse(patch)
      const updated = await interactionsRepo.update(id, parsed)
      await recomputeContactStats(existing.contact_id) // date change may move last/next
      return updated
    },

    // --- REL-14 deleteInteraction (hard — ledger has no deleted_at) -----------
    deleteInteraction: async (id) => {
      const existing = await interactionsRepo.findById(id)
      if (!existing) throw new InteractionNotFoundError(id)
      await interactionsRepo.hardDelete(id)
      await recomputeContactStats(existing.contact_id) // emptying the ledger → count 0, dates null
    },

    // --- REL-16 getTimeline (date desc, created_at desc tiebreak) ------------
    getTimeline: async (contactId) => {
      const rows = await interactionsRepo.findWhere(eq(interactions.contact_id, contactId))
      return rows.sort((a, b) =>
        a.date === b.date ? b.created_at - a.created_at : a.date < b.date ? 1 : -1,
      )
    },

    // --- REL-26 createEvent (RL-8; read-surfaced, never auto-completes/spawns) ---
    createEvent: async (input) => {
      const parsed = CreateEventSchema.parse(input)
      const contact = await contactsRepo.findById(parsed.contact_id) // soft-delete-aware guard
      if (!contact) throw new ContactNotFoundError(parsed.contact_id)
      const { reminder_days, ...rest } = parsed
      const row: CreateInput<typeof contactEvents> = {
        ...rest,
        event_type: parsed.event_type ?? 'custom', // NN-default backfill
        is_recurring: parsed.is_recurring ?? true, // NN-default backfill
        reminder_days: reminder_days != null ? JSON.stringify(reminder_days) : null,
      }
      const created = await eventsRepo.create(row)
      const persisted = await eventsRepo.findById(created.id) // re-read → faithful
      if (!persisted) throw new Error(`Event vanished after create: ${created.id}`)
      return toEventView(persisted)
    },

    // --- REL-27 getUpcomingEvents (recurring MM-DD projected into the range) ---
    getUpcomingEvents: async (range) => {
      const rows = await eventsRepo.findAll()
      const out: UpcomingEvent[] = []
      for (const row of rows) {
        const occurrence = row.is_recurring ? nextOccurrence(mmdd(row.event_date), range.from) : row.event_date
        if (occurrence >= range.from && occurrence <= range.to) {
          out.push({ event: toEventView(row), occurrence })
        }
      }
      return out.sort((a, b) => (a.occurrence < b.occurrence ? -1 : a.occurrence > b.occurrence ? 1 : 0))
    },

    // --- REL-28 getAllEvents (feeds All-Events page + Calendar) --------------
    getAllEvents: async () => {
      const rows = await eventsRepo.findAll()
      return rows
        .sort((a, b) => (a.event_date < b.event_date ? -1 : a.event_date > b.event_date ? 1 : 0))
        .map(toEventView)
    },

    // --- REL-30 createReminder (per-contact) ---------------------------------
    createReminder: async (input) => {
      const parsed = CreateReminderSchema.parse(input)
      const contact = await contactsRepo.findById(parsed.contact_id) // soft-delete-aware guard
      if (!contact) throw new ContactNotFoundError(parsed.contact_id)
      const created = await remindersRepo.create({
        ...parsed,
        is_recurring: parsed.is_recurring ?? false, // NN-default backfills
        is_completed: false,
        is_snoozed: false,
      })
      const persisted = await remindersRepo.findById(created.id) // re-read → faithful
      if (!persisted) throw new Error(`Reminder vanished after create: ${created.id}`)
      return persisted
    },

    // --- REL-31 completeReminder ---------------------------------------------
    completeReminder: async (id) => {
      const existing = await remindersRepo.findById(id)
      if (!existing) throw new ReminderNotFoundError(id)
      return remindersRepo.update(id, { is_completed: true })
    },

    // --- REL-32 snoozeReminder (G8) ------------------------------------------
    snoozeReminder: async (id, until) => {
      const existing = await remindersRepo.findById(id)
      if (!existing) throw new ReminderNotFoundError(id)
      return remindersRepo.update(id, { is_snoozed: true, snoozed_until: until })
    },

    // --- REL-39 createGroup --------------------------------------------------
    createGroup: async (input) => {
      const parsed = CreateGroupSchema.parse(input)
      const { days_of_week, ...rest } = parsed
      const created = await reminderGroupsRepo.create({
        ...rest,
        is_active: true, // NN-default backfills
        anchor_type: parsed.anchor_type ?? 'schedule',
        days_of_week: days_of_week != null ? JSON.stringify(days_of_week) : null,
      })
      const persisted = await reminderGroupsRepo.findById(created.id)
      if (!persisted) throw new Error(`Group vanished after create: ${created.id}`)
      return toGroupView(persisted)
    },

    // --- REL-40 addMembers (idempotent — UNIQUE(group,contact)) --------------
    addMembers: async (groupId, contactIds) => {
      const group = await reminderGroupsRepo.findById(groupId)
      if (!group) throw new ReminderGroupNotFoundError(groupId)
      const existing = await reminderGroupContactsRepo.findWhere(
        eq(reminderGroupContacts.reminder_group_id, groupId),
      )
      const have = new Set(existing.map((m) => m.contact_id))
      for (const cid of contactIds) {
        if (have.has(cid)) continue // skip existing (idempotent)
        await reminderGroupContactsRepo.create({ reminder_group_id: groupId, contact_id: cid })
      }
    },

    // --- REL-40 removeMembers ------------------------------------------------
    removeMembers: async (groupId, contactIds) => {
      const group = await reminderGroupsRepo.findById(groupId)
      if (!group) throw new ReminderGroupNotFoundError(groupId)
      const drop = new Set(contactIds)
      const existing = await reminderGroupContactsRepo.findWhere(
        eq(reminderGroupContacts.reminder_group_id, groupId),
      )
      for (const m of existing) {
        if (drop.has(m.contact_id)) await reminderGroupContactsRepo.hardDelete(m.id)
      }
    },

    // --- REL-41 setBirthdayAnchor (G11) --------------------------------------
    setBirthdayAnchor: async (groupId, daysBefore) => {
      const group = await reminderGroupsRepo.findById(groupId)
      if (!group) throw new ReminderGroupNotFoundError(groupId)
      const updated = await reminderGroupsRepo.update(groupId, {
        anchor_type: 'birthday',
        anchor_days_before: daysBefore,
      })
      return toGroupView(updated)
    },

    // --- REL-34 deleteGroup (SET NULL member reminders; purge junction) ------
    deleteGroup: async (groupId) => {
      const group = await reminderGroupsRepo.findById(groupId)
      if (!group) return // idempotent no-op
      // the reminder survives, ungrouped (RL-2/REL-34 SET NULL)
      const grouped = await remindersRepo.findWhere(eq(contactReminders.reminder_group_id, groupId))
      for (const r of grouped) await remindersRepo.update(r.id, { reminder_group_id: null })
      const junctions = await reminderGroupContactsRepo.findWhere(
        eq(reminderGroupContacts.reminder_group_id, groupId),
      )
      for (const j of junctions) await reminderGroupContactsRepo.hardDelete(j.id)
      await reminderGroupsRepo.hardDelete(groupId)
    },

    // --- REL-33/36 getDueReminders — the R7 dueIn producer -------------------
    getDueReminders: async (range) => {
      const fromISO = msToISO(range.start)
      const toISO = msToISO(range.end)
      const items: DueItem[] = []
      const push = (ref_id: string, label: string, dueISO: string): void => {
        items.push({
          source_module: 'relationships',
          ref_id,
          label,
          est_minutes: 0,
          urgency: 0, // no urgency algorithm at M1 (sessions dueIn precedent — deferred)
          hard_deadline: isoToMs(dueISO),
        })
      }

      // 1. explicit contact_reminders (effective-due = snoozed_until if snoozed, else reminder_date)
      const reminders = await remindersRepo.findAll()
      for (const r of reminders) {
        if (r.is_completed) continue
        const due = r.is_snoozed && r.snoozed_until ? r.snoozed_until : r.reminder_date
        if (due != null && due >= fromISO && due <= toISO) push(r.id, r.title, due)
      }

      // 2. stay-in-touch overdue nudge (REL-36 — the canonical local-scheduled case; overdue carries forward)
      const activeContacts = await contactsRepo.findAll()
      for (const c of activeContacts) {
        if (c.next_contact_date != null && c.next_contact_date <= toISO) {
          push(c.id, c.first_name, c.next_contact_date)
        }
      }

      // 3 + 4. groups (birthday-anchor + daily/weekly schedule; biweekly+ = flagged gap, not projected)
      const groups = await reminderGroupsRepo.findAll()
      for (const g of groups) {
        if (!g.is_active) continue
        const members = await reminderGroupContactsRepo.findWhere(
          eq(reminderGroupContacts.reminder_group_id, g.id),
        )
        if (g.anchor_type === 'birthday') {
          const before = g.anchor_days_before ?? 0
          for (const m of members) {
            const bdays = (await eventsRepo.findWhere(eq(contactEvents.contact_id, m.contact_id))).filter(
              (e) => e.event_type === 'birthday',
            )
            for (const b of bdays) {
              const occ = addDaysISO(nextOccurrence(mmdd(b.event_date), fromISO), -before)
              if (occ >= fromISO && occ <= toISO) push(`${g.id}:${m.contact_id}`, g.name, occ)
            }
          }
        } else if (g.frequency === 'daily' || g.frequency === 'weekly') {
          const dow = g.days_of_week ? (JSON.parse(g.days_of_week) as number[]) : null
          for (let iso = fromISO; iso <= toISO; iso = addDaysISO(iso, 1)) {
            if (g.frequency === 'daily' || (dow && dow.includes(isoWeekday(iso)))) push(`${g.id}:${iso}`, g.name, iso)
          }
        }
        // biweekly/monthly/quarterly/yearly schedule groups: no phase-anchor column → not projected (flagged forward)
      }

      return items.sort((a, b) => (a.hard_deadline ?? 0) - (b.hard_deadline ?? 0))
    },

    // --- REL-43 createNetwork ------------------------------------------------
    createNetwork: async (input) => {
      const parsed = CreateNetworkSchema.parse(input)
      const created = await networkGroupsRepo.create({ ...parsed, is_active: true }) // NN-default backfill
      const persisted = await networkGroupsRepo.findById(created.id) // re-read → faithful
      if (!persisted) throw new Error(`Network vanished after create: ${created.id}`)
      return persisted
    },

    // --- REL-44/45 addToNetwork (many-to-many, idempotent) -------------------
    addToNetwork: async (networkId, contactId) => {
      const network = await networkGroupsRepo.findById(networkId)
      if (!network) throw new NetworkNotFoundError(networkId)
      const contact = await contactsRepo.findById(contactId) // soft-delete-aware
      if (!contact) throw new ContactNotFoundError(contactId)
      const existing = await networkGroupContactsRepo.findWhere(
        and(eq(networkGroupContacts.network_group_id, networkId), eq(networkGroupContacts.contact_id, contactId))!,
      )
      if (existing.length > 0) return // idempotent (UNIQUE(network,contact), REL-45)
      await networkGroupContactsRepo.create({ network_group_id: networkId, contact_id: contactId })
    },

    // --- REL-44 removeFromNetwork --------------------------------------------
    removeFromNetwork: async (networkId, contactId) => {
      const network = await networkGroupsRepo.findById(networkId)
      if (!network) throw new NetworkNotFoundError(networkId)
      const rows = await networkGroupContactsRepo.findWhere(
        and(eq(networkGroupContacts.network_group_id, networkId), eq(networkGroupContacts.contact_id, contactId))!,
      )
      for (const r of rows) await networkGroupContactsRepo.hardDelete(r.id)
    },

    // --- REL-46 getNetworkGraph (membership edges only — no contact↔contact) -
    getNetworkGraph: async () => {
      const networks = (await networkGroupsRepo.findAll()).filter((n) => n.is_active)
      const activeIds = new Set(networks.map((n) => n.id))
      const junctions = await networkGroupContactsRepo.findAll()
      const edges: GraphEdge[] = junctions
        .filter((j) => activeIds.has(j.network_group_id)) // drop edges to inactive/absent networks (no dangling)
        .map((j) => ({ source: j.contact_id, target: j.network_group_id }))
      const memberIds = new Set(edges.map((e) => e.source))
      const members = (await contactsRepo.findAll()).filter((c) => memberIds.has(c.id))
      const nodes: GraphNode[] = [
        ...networks.map((n) => ({ id: n.id, kind: 'network' as const, label: n.name })),
        ...members.map((c) => ({ id: c.id, kind: 'contact' as const, label: c.first_name })),
      ]
      return { nodes, edges }
    },

    // --- REL-22…25 getContactHealth (derived; NOT a measurement — C1) --------
    getContactHealth: (id, asOf) => computeContactHealth(id, asOf),

    // --- REL-47 getNetworkHealth (rollup of members' health) -----------------
    getNetworkHealth: async (networkId, asOf) => {
      const network = await networkGroupsRepo.findById(networkId)
      if (!network) throw new NetworkNotFoundError(networkId)
      const members = await networkGroupContactsRepo.findWhere(
        eq(networkGroupContacts.network_group_id, networkId),
      )
      const counts: Record<HealthBand, number> = { new: 0, healthy: 0, at_risk: 0, overdue: 0 }
      const scores: number[] = []
      let worst: HealthBand = 'new'
      for (const m of members) {
        const h = await computeContactHealth(m.contact_id, asOf)
        counts[h.band] += 1
        if (h.score != null) scores.push(h.score)
        if (BAND_RANK[h.band] > BAND_RANK[worst]) worst = h.band
      }
      const score = scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : null
      return { band: worst, score, memberCount: members.length, factors: counts }
    },

    // --- REL-07 importDeviceContacts (X1 device-mediated; deny-safe) ---------
    importDeviceContacts: async (device) => {
      if (!device) throw new ContactsPermissionError() // no device/permission → no partial silent import (REL-10)
      const incoming = await device.readContacts() // device parsed/normalized/encrypted on-device (X1)
      const existing = await contactsRepo.findAll() // active only (soft-deleted don't match)
      return { staged: stageContacts(incoming, existing) } // staged, NOT committed (commit-on-confirm, X8)
    },

    // --- REL-08 commitContactImport (commit-on-confirm; never overwrites) ----
    commitContactImport: async (staged) => {
      const created: string[] = []
      const matched: string[] = []
      const skipped: string[] = []
      for (const s of staged) {
        if (s.status === 'new') {
          const c = await createContactImpl({
            first_name: s.raw.first_name,
            last_name: s.raw.last_name,
            email: s.raw.email,
            phone: s.raw.phone,
            company: s.raw.company,
          } as CreateContactInput)
          created.push(c.id)
        } else if (s.status === 'matched') {
          matched.push(s.sourceRowId) // the existing contact is NEVER overwritten (merge = P6/M2)
        } else {
          skipped.push(s.sourceRowId) // parse_error
        }
      }
      return { created, matched, skipped }
    },
  }
}
