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

import { eq, type SQL } from 'drizzle-orm'
import type { SocialLinks, RelationshipType, Frequency } from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import {
  contacts,
  contactEvents,
  interactions,
  contactReminders,
  reminderGroupContacts,
  networkGroupContacts,
  type ContactRow,
  type ContactEventRow,
} from '../../db/schema/relationships'
import {
  CreateContactSchema,
  UpdateContactSchema,
  CreateInteractionSchema,
  UpdateInteractionSchema,
  CreateEventSchema,
} from '../../validators/relationship'
import {
  type RelationshipsService,
  type RelationshipsServiceDeps,
  type ContactView,
  type EventView,
  type UpcomingEvent,
  ContactNotFoundError,
  InteractionNotFoundError,
} from './types'

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

export function createRelationshipsService(deps: RelationshipsServiceDeps): RelationshipsService {
  const { db, deviceId } = deps

  // contacts is the only soft-delete table (§5.9 floor); children/junctions hard-delete on cascade (RL-2).
  const contactsRepo = createRepository(db, contacts, { encryptedFields: [], deviceId, softDelete: true })
  const eventsRepo = createRepository(db, contactEvents, { encryptedFields: [], deviceId })
  const interactionsRepo = createRepository(db, interactions, { encryptedFields: [], deviceId })
  const remindersRepo = createRepository(db, contactReminders, { encryptedFields: [], deviceId })
  const reminderGroupContactsRepo = createRepository(db, reminderGroupContacts, { encryptedFields: [], deviceId })
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

  // --- intra-service closures (hoisted, not `this.`) -------------------------
  async function getContact(id: string): Promise<ContactView | null> {
    const row = await contactsRepo.findById(id) // soft-delete-aware (isNull(deleted_at))
    return row ? toView(row) : null
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
    createContact: async (input) => {
      const parsed = CreateContactSchema.parse(input) // async method → ZodError rejects (not sync throw)
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
      // create() echoes the INPUT row → omitted nullable PII cols come back `undefined`, not the DB `null`
      // ([[repository-create-returns-input-row-not-db-defaults]]). Re-read for a faithful ContactView (all nulls
      // authoritative + social_links parsed) — the update()-returns-re-read precedent.
      const view = await getContact(created.id)
      if (!view) throw new Error(`Contact vanished after create: ${created.id}`)
      return view
    },

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
  }
}
