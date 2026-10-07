// ============================================================================
// mod-relationships #56 ① · S1 — contact CRUD spine (REL-01…06, DB-11 reconcile)
//
// Node / better-sqlite3 live-store harness (mirrors purposes/projects): REAL store, UNLOCKED vault,
// migrate() applies 025_relationships so the 8 tables exist. Exercises the create-echoes-input backfill,
// the social_links JSON serialize/parse boundary, the soft-delete + app-layer cascade (RL-2), and the
// ContactNotFoundError guard on soft-deleted/unknown ids. Maps 1:1 to slice-map S1 + spec §4 acceptance.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createRepository } from '../../../db/repository'
import {
  contactEvents,
  interactions,
  contactReminders,
  reminderGroups,
  reminderGroupContacts,
  networkGroups,
  networkGroupContacts,
} from '../../../db/schema/relationships'
import { createRelationshipsService } from '../service'
import {
  type RelationshipsService,
  ContactNotFoundError,
  InteractionNotFoundError,
  ReminderNotFoundError,
  ReminderGroupNotFoundError,
} from '../types'

/** YYYY-MM-DD → Unix ms at UTC midnight (for TimeRange windows). */
const ms = (iso: string): number => Date.parse(iso + 'T00:00:00Z')

function createBetterSqlite3Driver(db: Database.Database): SqliteDriver {
  return {
    async exec(sqlText, params) {
      const stmt = db.prepare(sqlText)
      if (stmt.reader) {
        const rows = stmt.all(...(params ?? [])) as Record<string, unknown>[]
        return { rows, changes: 0, lastInsertRowId: 0 }
      }
      const info = stmt.run(...(params ?? []))
      return { rows: [], changes: info.changes, lastInsertRowId: info.lastInsertRowid }
    },
    async run(sqlText, params) {
      if (!params || params.length === 0) db.exec(sqlText)
      else db.prepare(sqlText).run(...params)
    },
    async query(sqlText, params) {
      return db.prepare(sqlText).all(...(params ?? [])) as never
    },
    async values(sqlText, params) {
      return db.prepare(sqlText).raw().all(...(params ?? [])) as unknown[][]
    },
    async batch(statements) {
      for (const s of statements) {
        if (s.params && s.params.length > 0) db.prepare(s.sql).run(...s.params)
        else db.exec(s.sql)
      }
    },
    async close() {
      db.close()
    },
  }
}

const DEVICE = 'test-device'

interface Harness {
  svc: RelationshipsService
  db: DrizzleDb
  bsql: Database.Database
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createRelationshipsService({ db, deviceId: DEVICE })
  return { svc, db, bsql }
}

describe('mod-relationships S1 — contact CRUD spine', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('creates a contact with NN-default backfill + reads it back (live persist probe)', async () => {
    const c = await h.svc.createContact({ first_name: 'Ada' })
    expect(c.id).toBeTruthy()
    expect(c.first_name).toBe('Ada')
    expect(c.relationship_type).toBe('acquaintance') // backfilled NN default (create echoes input)
    expect(c.interaction_count).toBe(0)
    expect(Boolean(c.is_favorite)).toBe(false)
    expect(c.deleted_at).toBeNull()
    const read = await h.svc.getContact(c.id)
    expect(read?.first_name).toBe('Ada')
  })

  it('round-trips social_links through the JSON boundary (object in → object out)', async () => {
    const c = await h.svc.createContact({
      first_name: 'Grace',
      social_links: { linkedin: 'grace', whatsapp: '+1' },
    })
    expect(c.social_links).toEqual({ linkedin: 'grace', whatsapp: '+1' }) // parsed object, not JSON string
    const read = await h.svc.getContact(c.id)
    expect(read?.social_links).toEqual({ linkedin: 'grace', whatsapp: '+1' })
    // null stays null
    const d = await h.svc.createContact({ first_name: 'None', social_links: null })
    expect(d.social_links).toBeNull()
  })

  it('accepts a free-form closeness_tier (OPEN vocab, no enum)', async () => {
    const c = await h.svc.createContact({ first_name: 'Inner', closeness_tier: 'inner-circle' })
    expect(c.closeness_tier).toBe('inner-circle')
  })

  it('updates a contact, bumps sync version, and patches social_links', async () => {
    const c = await h.svc.createContact({ first_name: 'Linus', company: 'old' })
    const upd = await h.svc.updateContact(c.id, { company: 'new', social_links: { twitter: 't' } })
    expect(upd.company).toBe('new')
    expect(upd.social_links).toEqual({ twitter: 't' })
    expect(upd._sync_version).toBe(2) // bumped from 1
  })

  it('toggles is_favorite', async () => {
    const c = await h.svc.createContact({ first_name: 'Fav' })
    const on = await h.svc.toggleFavorite(c.id)
    expect(Boolean(on.is_favorite)).toBe(true)
    const off = await h.svc.toggleFavorite(c.id)
    expect(Boolean(off.is_favorite)).toBe(false)
  })

  it('rejects update/toggleFavorite of an unknown OR soft-deleted contact (ContactNotFoundError)', async () => {
    await expect(h.svc.updateContact('nope', { company: 'x' })).rejects.toBeInstanceOf(ContactNotFoundError)
    await expect(h.svc.toggleFavorite('nope')).rejects.toBeInstanceOf(ContactNotFoundError)
    const c = await h.svc.createContact({ first_name: 'Gone' })
    await h.svc.softDeleteContact(c.id)
    // soft-deleted → not a silent resurrect-edit (preflight G1)
    await expect(h.svc.updateContact(c.id, { company: 'x' })).rejects.toBeInstanceOf(ContactNotFoundError)
    await expect(h.svc.toggleFavorite(c.id)).rejects.toBeInstanceOf(ContactNotFoundError)
  })

  it('rejects createContact without first_name + a bad relationship_type enum', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(h.svc.createContact({} as any)).rejects.toThrow()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(h.svc.createContact({ first_name: 'x', relationship_type: 'bogus' } as any)).rejects.toThrow()
  })

  it('lists active contacts only, honoring relationship_type + is_favorite filters', async () => {
    const fam = await h.svc.createContact({ first_name: 'Mom', relationship_type: 'family', is_favorite: true })
    await h.svc.createContact({ first_name: 'Bob', relationship_type: 'colleague' })
    const gone = await h.svc.createContact({ first_name: 'Zed', relationship_type: 'family' })
    await h.svc.softDeleteContact(gone.id)

    expect(await h.svc.listContacts()).toHaveLength(2) // Zed hidden
    const family = await h.svc.listContacts({ relationship_type: 'family' })
    expect(family.map((c) => c.first_name)).toEqual(['Mom'])
    const favs = await h.svc.listContacts({ is_favorite: true })
    expect(favs.map((c) => c.id)).toEqual([fam.id])
  })

  it('soft-deletes a contact: hidden from list/get, children cascade-purged, groups survive', async () => {
    const c = await h.svc.createContact({ first_name: 'Hub' })
    const other = await h.svc.createContact({ first_name: 'Keep' })

    // seed children + group memberships via repos (S1 exposes only contact methods)
    const eventsRepo = createRepository(h.db, contactEvents, { encryptedFields: [], deviceId: DEVICE })
    const interactionsRepo = createRepository(h.db, interactions, { encryptedFields: [], deviceId: DEVICE })
    const remindersRepo = createRepository(h.db, contactReminders, { encryptedFields: [], deviceId: DEVICE })
    const rgRepo = createRepository(h.db, reminderGroups, { encryptedFields: [], deviceId: DEVICE })
    const rgcRepo = createRepository(h.db, reminderGroupContacts, { encryptedFields: [], deviceId: DEVICE })
    const ngRepo = createRepository(h.db, networkGroups, { encryptedFields: [], deviceId: DEVICE })
    const ngcRepo = createRepository(h.db, networkGroupContacts, { encryptedFields: [], deviceId: DEVICE })

    await eventsRepo.create({ contact_id: c.id, event_type: 'birthday', event_date: '01-15' })
    await interactionsRepo.create({ contact_id: c.id, interaction_type: 'call', date: '2026-10-01' })
    await remindersRepo.create({ contact_id: c.id, title: 'ring Hub' })
    const rg = await rgRepo.create({ name: 'Inner', anchor_type: 'schedule' })
    await rgcRepo.create({ reminder_group_id: rg.id, contact_id: c.id })
    await rgcRepo.create({ reminder_group_id: rg.id, contact_id: other.id }) // a sibling membership survives
    const ng = await ngRepo.create({ name: 'Family Net' })
    await ngcRepo.create({ network_group_id: ng.id, contact_id: c.id })

    await h.svc.softDeleteContact(c.id)

    // contact hidden, Keep still present
    expect(await h.svc.getContact(c.id)).toBeNull()
    expect(await h.svc.listContacts()).toHaveLength(1)

    // children of Hub purged
    expect(await eventsRepo.findWhere(eq(contactEvents.contact_id, c.id))).toHaveLength(0)
    expect(await interactionsRepo.findWhere(eq(interactions.contact_id, c.id))).toHaveLength(0)
    expect(await remindersRepo.findWhere(eq(contactReminders.contact_id, c.id))).toHaveLength(0)
    expect(await rgcRepo.findWhere(eq(reminderGroupContacts.contact_id, c.id))).toHaveLength(0)
    expect(await ngcRepo.findWhere(eq(networkGroupContacts.contact_id, c.id))).toHaveLength(0)

    // the GROUPS themselves survive (not children of a contact), and the sibling membership survives
    expect(await rgRepo.findById(rg.id)).not.toBeNull()
    expect(await ngRepo.findById(ng.id)).not.toBeNull()
    expect(await rgcRepo.findWhere(eq(reminderGroupContacts.contact_id, other.id))).toHaveLength(1)
  })

  it('soft-delete of a missing/already-deleted contact is an idempotent no-op', async () => {
    await expect(h.svc.softDeleteContact('ghost')).resolves.toBeUndefined()
    const c = await h.svc.createContact({ first_name: 'Twice' })
    await h.svc.softDeleteContact(c.id)
    await expect(h.svc.softDeleteContact(c.id)).resolves.toBeUndefined()
  })
})

describe('mod-relationships S2 — interactions ledger + derived stats', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('logs interactions and recomputes count + last_interaction_date from the ledger', async () => {
    const c = await h.svc.createContact({ first_name: 'Ada' })
    await h.svc.logInteraction({ contact_id: c.id, interaction_type: 'call', date: '2026-09-01' })
    await h.svc.logInteraction({ contact_id: c.id, interaction_type: 'email', date: '2026-10-05' })
    const contact = await h.svc.getContact(c.id)
    expect(contact?.interaction_count).toBe(2)
    expect(contact?.last_interaction_date).toBe('2026-10-05') // MAX date
  })

  it('derives next_contact_date: days override, frequency fallback, days-precedence, neither→null', async () => {
    // stay_in_touch_days exact override
    const a = await h.svc.createContact({ first_name: 'Days', stay_in_touch_days: 10 })
    await h.svc.logInteraction({ contact_id: a.id, interaction_type: 'call', date: '2026-10-01' })
    expect((await h.svc.getContact(a.id))?.next_contact_date).toBe('2026-10-11') // +10

    // frequency fallback (weekly = 7)
    const b = await h.svc.createContact({ first_name: 'Weekly', stay_in_touch_frequency: 'weekly' })
    await h.svc.logInteraction({ contact_id: b.id, interaction_type: 'call', date: '2026-10-01' })
    expect((await h.svc.getContact(b.id))?.next_contact_date).toBe('2026-10-08') // +7

    // days takes precedence over frequency
    const d = await h.svc.createContact({ first_name: 'Both', stay_in_touch_days: 3, stay_in_touch_frequency: 'yearly' })
    await h.svc.logInteraction({ contact_id: d.id, interaction_type: 'call', date: '2026-10-01' })
    expect((await h.svc.getContact(d.id))?.next_contact_date).toBe('2026-10-04') // +3, not +365

    // neither → not tracked (null)
    const n = await h.svc.createContact({ first_name: 'None' })
    await h.svc.logInteraction({ contact_id: n.id, interaction_type: 'call', date: '2026-10-01' })
    expect((await h.svc.getContact(n.id))?.next_contact_date).toBeNull()
  })

  it('updateInteraction moves last/next when the latest date changes', async () => {
    const c = await h.svc.createContact({ first_name: 'Mut', stay_in_touch_days: 5 })
    const i = await h.svc.logInteraction({ contact_id: c.id, interaction_type: 'call', date: '2026-10-01' })
    await h.svc.updateInteraction(i.id, { date: '2026-10-20', sentiment: 'positive' })
    const contact = await h.svc.getContact(c.id)
    expect(contact?.last_interaction_date).toBe('2026-10-20')
    expect(contact?.next_contact_date).toBe('2026-10-25') // +5
  })

  it('deleteInteraction recomputes; deleting the last clears count + dates', async () => {
    const c = await h.svc.createContact({ first_name: 'Del', stay_in_touch_days: 7 })
    const i1 = await h.svc.logInteraction({ contact_id: c.id, interaction_type: 'call', date: '2026-09-01' })
    const i2 = await h.svc.logInteraction({ contact_id: c.id, interaction_type: 'text', date: '2026-10-01' })
    await h.svc.deleteInteraction(i2.id)
    let contact = await h.svc.getContact(c.id)
    expect(contact?.interaction_count).toBe(1)
    expect(contact?.last_interaction_date).toBe('2026-09-01') // reverts to the remaining one
    await h.svc.deleteInteraction(i1.id)
    contact = await h.svc.getContact(c.id)
    expect(contact?.interaction_count).toBe(0)
    expect(contact?.last_interaction_date).toBeNull()
    expect(contact?.next_contact_date).toBeNull()
  })

  it('getTimeline returns the contact interactions date-desc', async () => {
    const c = await h.svc.createContact({ first_name: 'TL' })
    await h.svc.logInteraction({ contact_id: c.id, interaction_type: 'call', date: '2026-08-01' })
    await h.svc.logInteraction({ contact_id: c.id, interaction_type: 'email', date: '2026-10-01' })
    await h.svc.logInteraction({ contact_id: c.id, interaction_type: 'text', date: '2026-09-01' })
    const tl = await h.svc.getTimeline(c.id)
    expect(tl.map((i) => i.date)).toEqual(['2026-10-01', '2026-09-01', '2026-08-01'])
  })

  it('guards: log on missing/soft-deleted contact → ContactNotFoundError; update/delete unknown → InteractionNotFoundError', async () => {
    await expect(
      h.svc.logInteraction({ contact_id: 'nope', interaction_type: 'call', date: '2026-10-01' }),
    ).rejects.toBeInstanceOf(ContactNotFoundError)
    const c = await h.svc.createContact({ first_name: 'Gone' })
    await h.svc.softDeleteContact(c.id)
    await expect(
      h.svc.logInteraction({ contact_id: c.id, interaction_type: 'call', date: '2026-10-01' }),
    ).rejects.toBeInstanceOf(ContactNotFoundError)
    await expect(h.svc.updateInteraction('nope', { sentiment: 'positive' })).rejects.toBeInstanceOf(
      InteractionNotFoundError,
    )
    await expect(h.svc.deleteInteraction('nope')).rejects.toBeInstanceOf(InteractionNotFoundError)
  })

  it('rejects a bad interaction_type / sentiment enum', async () => {
    const c = await h.svc.createContact({ first_name: 'Enum' })
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      h.svc.logInteraction({ contact_id: c.id, interaction_type: 'bogus' as any, date: '2026-10-01' }),
    ).rejects.toThrow()
    const i = await h.svc.logInteraction({ contact_id: c.id, interaction_type: 'call', date: '2026-10-01' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(h.svc.updateInteraction(i.id, { sentiment: 'meh' as any })).rejects.toThrow()
  })
})

describe('mod-relationships S3 — events', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('creates an event with NN-default backfill + reminder_days JSON round-trip', async () => {
    const c = await h.svc.createContact({ first_name: 'Ada' })
    const e = await h.svc.createEvent({ contact_id: c.id, event_date: '11-15', reminder_days: [1, 7] })
    expect(e.event_type).toBe('custom') // backfill
    expect(e.is_recurring).toBe(true) // backfill
    expect(e.reminder_days).toEqual([1, 7]) // parsed array, not JSON string
    const all = await h.svc.getAllEvents()
    expect(all).toHaveLength(1)
    expect(all[0].reminder_days).toEqual([1, 7])
  })

  it('guards createEvent against a missing/soft-deleted contact + a bad event_type', async () => {
    await expect(h.svc.createEvent({ contact_id: 'nope', event_date: '01-01' })).rejects.toBeInstanceOf(
      ContactNotFoundError,
    )
    const c = await h.svc.createContact({ first_name: 'Gone' })
    await h.svc.softDeleteContact(c.id)
    await expect(h.svc.createEvent({ contact_id: c.id, event_date: '01-01' })).rejects.toBeInstanceOf(
      ContactNotFoundError,
    )
    const live = await h.svc.createContact({ first_name: 'Live' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(h.svc.createEvent({ contact_id: live.id, event_date: '01-01', event_type: 'nope' as any })).rejects.toThrow()
  })

  it('getAllEvents returns every event, event_date asc', async () => {
    const c = await h.svc.createContact({ first_name: 'Multi' })
    await h.svc.createEvent({ contact_id: c.id, event_type: 'birthday', event_date: '11-15' })
    await h.svc.createEvent({ contact_id: c.id, event_type: 'anniversary', event_date: '03-02' })
    const all = await h.svc.getAllEvents()
    expect(all.map((e) => e.event_date)).toEqual(['03-02', '11-15'])
  })

  it('getUpcomingEvents projects recurring MM-DD into the range, filters, and sorts by occurrence', async () => {
    const c = await h.svc.createContact({ first_name: 'Cal' })
    await h.svc.createEvent({ contact_id: c.id, event_type: 'birthday', event_date: '11-15' }) // recurring
    await h.svc.createEvent({ contact_id: c.id, event_type: 'birthday', event_date: '01-10' }) // recurring, wraps
    await h.svc.createEvent({ contact_id: c.id, event_type: 'custom', event_date: '2026-11-20', is_recurring: false }) // one-time

    const q4 = await h.svc.getUpcomingEvents({ from: '2026-10-01', to: '2026-12-31' })
    // 11-15 → 2026-11-15, one-time 2026-11-20; 01-10 wraps to 2027-01-10 (out of range)
    expect(q4.map((u) => u.occurrence)).toEqual(['2026-11-15', '2026-11-20'])

    const wrap = await h.svc.getUpcomingEvents({ from: '2026-12-01', to: '2027-02-01' })
    expect(wrap.map((u) => u.occurrence)).toEqual(['2027-01-10']) // the wrapped birthday
  })
})

describe('mod-relationships S4 — reminders, groups, and the dueIn producer', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('creates/completes/snoozes a reminder; unknown id → ReminderNotFoundError', async () => {
    const c = await h.svc.createContact({ first_name: 'Rem' })
    const r = await h.svc.createReminder({ contact_id: c.id, title: 'ring' })
    expect(r.is_completed).toBe(false) // backfill
    expect(r.is_snoozed).toBe(false)
    const done = await h.svc.completeReminder(r.id)
    expect(done.is_completed).toBe(true)
    const snoozed = await h.svc.snoozeReminder(r.id, '2026-12-01')
    expect(snoozed.is_snoozed).toBe(true)
    expect(snoozed.snoozed_until).toBe('2026-12-01')
    await expect(h.svc.completeReminder('nope')).rejects.toBeInstanceOf(ReminderNotFoundError)
    await expect(h.svc.snoozeReminder('nope', '2026-12-01')).rejects.toBeInstanceOf(ReminderNotFoundError)
  })

  it('createReminder guards a live contact', async () => {
    await expect(h.svc.createReminder({ contact_id: 'nope', title: 'x' })).rejects.toBeInstanceOf(ContactNotFoundError)
  })

  it('creates a group (days_of_week JSON round-trip + backfill), manages members idempotently, sets anchor', async () => {
    const c1 = await h.svc.createContact({ first_name: 'A' })
    const c2 = await h.svc.createContact({ first_name: 'B' })
    const g = await h.svc.createGroup({ name: 'Inner', days_of_week: [1, 3] })
    expect(g.is_active).toBe(true) // backfill
    expect(g.anchor_type).toBe('schedule') // backfill
    expect(g.days_of_week).toEqual([1, 3]) // parsed array
    await h.svc.addMembers(g.id, [c1.id, c2.id])
    await h.svc.addMembers(g.id, [c1.id]) // idempotent — no duplicate
    await h.svc.removeMembers(g.id, [c2.id])
    const anchored = await h.svc.setBirthdayAnchor(g.id, 3)
    expect(anchored.anchor_type).toBe('birthday')
    expect(anchored.anchor_days_before).toBe(3)
    await expect(h.svc.addMembers('nope', [c1.id])).rejects.toBeInstanceOf(ReminderGroupNotFoundError)
    await expect(h.svc.setBirthdayAnchor('nope', 1)).rejects.toBeInstanceOf(ReminderGroupNotFoundError)
  })

  it('deleteGroup: group gone, member reminders SET NULL (survive), junctions purged (REL-34)', async () => {
    const c = await h.svc.createContact({ first_name: 'Grp' })
    const g = await h.svc.createGroup({ name: 'Doomed' })
    await h.svc.addMembers(g.id, [c.id])
    const r = await h.svc.createReminder({ contact_id: c.id, title: 'grouped', reminder_group_id: g.id })

    const rgRepo = createRepository(h.db, reminderGroups, { encryptedFields: [], deviceId: DEVICE })
    const remRepo = createRepository(h.db, contactReminders, { encryptedFields: [], deviceId: DEVICE })
    const rgcRepo = createRepository(h.db, reminderGroupContacts, { encryptedFields: [], deviceId: DEVICE })

    await h.svc.deleteGroup(g.id)

    expect(await rgRepo.findById(g.id)).toBeNull() // group gone
    const survivor = await remRepo.findById(r.id)
    expect(survivor).not.toBeNull() // reminder survives
    expect(survivor?.reminder_group_id).toBeNull() // ungrouped (SET NULL, REL-34)
    expect(await rgcRepo.findWhere(eq(reminderGroupContacts.reminder_group_id, g.id))).toHaveLength(0) // junction purged
    await expect(h.svc.deleteGroup(g.id)).resolves.toBeUndefined() // idempotent
  })

  it('getDueReminders: explicit (snoozed uses snoozed_until; completed excluded) + stay-in-touch overdue', async () => {
    const c = await h.svc.createContact({ first_name: 'Due', stay_in_touch_days: 7 })
    await h.svc.logInteraction({ contact_id: c.id, interaction_type: 'call', date: '2026-10-01' }) // next = 2026-10-08
    const r = await h.svc.createReminder({ contact_id: c.id, title: 'call back', reminder_date: '2026-10-15' })
    await h.svc.createReminder({ contact_id: c.id, title: 'done one', reminder_date: '2026-10-16' }).then((x) => h.svc.completeReminder(x.id))

    const due = await h.svc.getDueReminders({ start: ms('2026-10-01'), end: ms('2026-10-31') })
    const refs = due.map((d) => d.ref_id)
    expect(refs).toContain(r.id) // explicit due in window
    expect(refs).toContain(c.id) // stay-in-touch overdue (next_contact_date 2026-10-08 <= toISO)
    expect(due.find((d) => d.label === 'done one')).toBeUndefined() // completed excluded

    // snoozed reminder surfaces at snoozed_until, not reminder_date
    await h.svc.snoozeReminder(r.id, '2026-11-20')
    const octo = await h.svc.getDueReminders({ start: ms('2026-10-01'), end: ms('2026-10-31') })
    expect(octo.map((d) => d.ref_id)).not.toContain(r.id) // snoozed out of October
    const novo = await h.svc.getDueReminders({ start: ms('2026-11-01'), end: ms('2026-11-30') })
    expect(novo.map((d) => d.ref_id)).toContain(r.id) // now due in November
  })

  it('getDueReminders: birthday-anchor group fires at birthday − daysBefore', async () => {
    const c = await h.svc.createContact({ first_name: 'Bday' })
    await h.svc.createEvent({ contact_id: c.id, event_type: 'birthday', event_date: '11-15' })
    const g = await h.svc.createGroup({ name: 'Bdays' })
    await h.svc.addMembers(g.id, [c.id])
    await h.svc.setBirthdayAnchor(g.id, 3) // fire on 11-12
    const due = await h.svc.getDueReminders({ start: ms('2026-11-01'), end: ms('2026-11-30') })
    const item = due.find((d) => d.ref_id === `${g.id}:${c.id}`)
    expect(item).toBeDefined()
    expect(item?.hard_deadline).toBe(ms('2026-11-12')) // 11-15 − 3
  })

  it('getDueReminders: daily/weekly schedule groups project; biweekly is NOT projected (flagged gap)', async () => {
    const c = await h.svc.createContact({ first_name: 'Sched' })
    const daily = await h.svc.createGroup({ name: 'Daily', frequency: 'daily' })
    await h.svc.addMembers(daily.id, [c.id])
    const dueDaily = await h.svc.getDueReminders({ start: ms('2026-11-01'), end: ms('2026-11-03') })
    expect(dueDaily.filter((d) => d.ref_id.startsWith(`${daily.id}:`))).toHaveLength(3) // 3 days

    // weekly on a specific weekday (compute it so the test is deterministic)
    const anchorDate = '2026-11-16'
    const weekday = new Date(anchorDate + 'T00:00:00Z').getUTCDay()
    const weekly = await h.svc.createGroup({ name: 'Weekly', frequency: 'weekly', days_of_week: [weekday] })
    await h.svc.addMembers(weekly.id, [c.id])
    const dueWeekly = await h.svc.getDueReminders({ start: ms('2026-11-15'), end: ms('2026-11-21') })
    const weeklyItems = dueWeekly.filter((d) => d.ref_id.startsWith(`${weekly.id}:`))
    expect(weeklyItems).toHaveLength(1)
    expect(weeklyItems[0].hard_deadline).toBe(ms(anchorDate))

    // biweekly → flagged gap, not projected
    const biweekly = await h.svc.createGroup({ name: 'Biweekly', frequency: 'biweekly', days_of_week: [weekday] })
    await h.svc.addMembers(biweekly.id, [c.id])
    const dueBi = await h.svc.getDueReminders({ start: ms('2026-11-01'), end: ms('2026-11-30') })
    expect(dueBi.filter((d) => d.ref_id.startsWith(`${biweekly.id}:`))).toHaveLength(0)
  })
})
