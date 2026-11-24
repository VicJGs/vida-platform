// ============================================================================
// LIF-703 — Views: the filter grammar (ADR-007 §3.6) — tags nested/any/all/none + the §3.6.4 compatibility read.
//
// Node / better-sqlite3 live-store harness (the mod-tasks S8 pattern): REAL SpacesService (tags), REAL TasksService
// + its ReadProvider, REAL ViewsService rows and the REAL ViewEngine. Every assertion goes through `engine.resolve`
// over a stored `views` row, so the read path (parse → provider) is what is proven, not an internal helper.
// ============================================================================

import { describe, it, expect, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createRepository } from '../../../db/repository'
import { views as viewsTable, type ViewRow } from '../../../db/schema/foundation/spaces'
import { createTaggableTypeRegistry, createSpacesService } from '../../spaces'
import { createBacklinkResolver } from '../../../services/search/backlink-resolver'
import { createNotesService } from '../../../services/notes'
import { createTasksService, registerTasksReadProvider } from '../../../services/tasks/service'
import { createViewProviderRegistry, createViewsService, createViewEngine, type ViewFilter } from '../index'

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
      return db
        .prepare(sqlText)
        .raw()
        .all(...(params ?? [])) as unknown[][]
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

async function setup() {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const deviceId = 'test-device'
  const registry = createTaggableTypeRegistry()
  const spaces = createSpacesService(db, deviceId, registry)
  const backlinks = createBacklinkResolver(db, deviceId)
  const notes = createNotesService({ db, deviceId, spaces, backlinks, registry })
  const views = createViewsService(db, deviceId)
  const providers = createViewProviderRegistry()
  const engine = createViewEngine(providers)
  const svc = createTasksService({ db, deviceId, spaces, notes, views, providers })
  registerTasksReadProvider(providers, { svc, db, deviceId })
  /** Store a filter EXACTLY as an older client wrote it (raw JSON TEXT) — bypasses today's `ViewFilter` type. */
  const storeRaw = (filter: unknown): Promise<ViewRow> =>
    createRepository(db, viewsTable, { deviceId, softDelete: true, encryptedFields: [] }).create({
      space_id: null,
      name: 'stored',
      layout: 'list',
      filter: JSON.stringify(filter),
      grouping: null,
      sort: null,
    }) as Promise<ViewRow>
  return { db, spaces, views, providers, engine, svc, storeRaw }
}

const ids = (rows: unknown[]): string[] => rows.map((r) => (r as { id: string }).id).sort()

describe('LIF-703 — the ADR-007 §3.6 filter grammar', () => {
  it('VW-8 a stored pre-grammar filter reads through the compatibility rules', async () => {
    // (c) ViewFilter IS the grammar, typed: a full §3.6 literal (TagClause, nested any/not clauses, a list value, a
    // relative-date value, exclude_unsupported, lanes) must satisfy the exported type (`pnpm typecheck` proves it).
    const grammar = {
      entity_types: ['task'],
      tags: { any: ['t-a'], all: ['t-b'], none: ['t-c'] },
      where: [
        { field: 'status', op: 'in', value: ['not_started', 'in_progress'] },
        {
          any: [{ field: 'priority', op: 'eq', value: 'high' }, { not: { field: 'due_date', op: 'exists' } }],
        },
        { field: 'due_date', op: 'lte', value: { rel: 'today', days: 7 } },
        { field: 'due_date', op: 'between', value: ['2026-01-01', '2026-12-31'] },
        { field: 'title', op: 'contains', value: 'brief' },
      ],
      exclude_unsupported: false,
      lanes: ['view-1'],
    } satisfies ViewFilter
    expect(grammar.where).toHaveLength(5)

    const h = await setup()
    const t1 = await h.spaces.createTag({ name: 't1' })
    const t1child = await h.spaces.createTag({ name: 't1/child', parent_tag_id: t1.id })
    const tagged = await h.svc.createTask({ title: 'tagged, in progress', status: 'in_progress' })
    const nested = await h.svc.createTask({ title: 'child-tagged, in progress', status: 'in_progress' })
    const taggedIdle = await h.svc.createTask({ title: 'tagged, not started' })
    await h.svc.createTask({ title: 'untagged, in progress', status: 'in_progress' })
    await h.svc.tagTask(tagged.id, t1.id)
    await h.svc.tagTask(nested.id, t1child.id)
    await h.svc.tagTask(taggedIdle.id, t1.id)

    // (a) a stored `tags: string[]` reads as `{ any: [...] }`; a stored `predicates: { k: v }` reads as an `eq` conjunct.
    const legacy = await h.storeRaw({ entity_types: ['task'], tags: [t1.id], predicates: { status: 'in_progress' } })
    const modern = await h.views.createView({
      name: 'grammar',
      layout: 'list',
      filter: {
        entity_types: ['task'],
        tags: { any: [t1.id] },
        where: [{ field: 'status', op: 'eq', value: 'in_progress' }],
      },
    })
    const expected = [tagged.id, nested.id].sort()
    const legacyResolved = await h.engine.resolve(legacy)
    const modernResolved = await h.engine.resolve(modern)
    expect(legacyResolved.state).toBe('success')
    expect(ids(legacyResolved.rows)).toEqual(expected)
    expect(ids(modernResolved.rows)).toEqual(expected)

    // (b) a legacy alias key the provider declares: Tasks `due_before` → { field: 'due_date', op: 'lt' } (STRICT).
    const early = await h.svc.createTask({ title: 'due early', due_date: '2026-01-31' })
    await h.svc.createTask({ title: 'due on the day', due_date: '2026-02-01' })
    await h.svc.createTask({ title: 'due late', due_date: '2026-02-02' })
    const legacyDue = await h.storeRaw({ entity_types: ['task'], predicates: { due_before: '2026-02-01' } })
    const modernDue = await h.views.createView({
      name: 'due',
      layout: 'list',
      filter: { entity_types: ['task'], where: [{ field: 'due_date', op: 'lt', value: '2026-02-01' }] },
    })
    expect(ids((await h.engine.resolve(legacyDue)).rows)).toEqual([early.id])
    expect(ids((await h.engine.resolve(modernDue)).rows)).toEqual([early.id])
  })

  it('VW-8 every provider applies tags nested, any, all and none the same way', async () => {
    // Tags: P ⊃ C (C is P's child, ADR-006), plus X and Y. Each fixture row carries a set of tag keys.
    type TagKey = 'P' | 'C' | 'X' | 'Y'
    const FIXTURE: Record<string, TagKey[]> = {
      rP: ['P'],
      rC: ['C'],
      rCX: ['C', 'X'],
      rX: ['X'],
      rY: ['Y'],
      rPY: ['P', 'Y'],
      rNone: [],
    }
    type Clause = { any?: TagKey[]; all?: TagKey[]; none?: TagKey[] }
    const CASES: { name: string; tags: Clause; expect: string[] }[] = [
      {
        name: 'nested: a child-tagged row is a member of the parent',
        tags: { any: ['P'] },
        expect: ['rP', 'rC', 'rCX', 'rPY'],
      },
      { name: 'nested goes up, never down', tags: { any: ['C'] }, expect: ['rC', 'rCX'] },
      { name: 'any = union', tags: { any: ['X', 'Y'] }, expect: ['rCX', 'rX', 'rY', 'rPY'] },
      { name: 'all = intersection, nested-aware', tags: { all: ['P', 'X'] }, expect: ['rCX'] },
      { name: 'all over a single tag = its nested members', tags: { all: ['P'] }, expect: ['rP', 'rC', 'rCX', 'rPY'] },
      { name: 'none = exclusion, nested-aware', tags: { none: ['P'] }, expect: ['rX', 'rY', 'rNone'] },
      {
        name: 'none of a child keeps the parent-only rows',
        tags: { none: ['C'] },
        expect: ['rP', 'rX', 'rY', 'rPY', 'rNone'],
      },
      { name: 'any AND all AND none', tags: { any: ['X', 'Y'], all: ['P'], none: ['Y'] }, expect: ['rCX'] },
      { name: 'all AND none, nested exclusion', tags: { all: ['P'], none: ['C'] }, expect: ['rP', 'rPY'] },
      { name: 'an empty clause filters nothing', tags: {}, expect: Object.keys(FIXTURE) },
    ]

    type Harness = Awaited<ReturnType<typeof setup>>
    /** Per-entity-type fixture seeders. A provider registered without one FAILS this test — every provider must prove
     *  the same tag semantics. Each seeder creates one entity per FIXTURE row, tagged with the given tag ids. */
    const SEEDERS: Record<string, (h: Harness, rows: Record<string, string[]>) => Promise<Record<string, string>>> = {
      task: async (h, rows) => {
        const out: Record<string, string> = {}
        for (const [key, tagIds] of Object.entries(rows)) {
          const t = await h.svc.createTask({ title: key })
          for (const tagId of tagIds) await h.svc.tagTask(t.id, tagId)
          out[key] = t.id
        }
        return out
      },
    }

    const probe = await setup()
    const entityTypes = probe.providers.list().map((p) => p.entityType)
    expect(entityTypes).toContain('task')

    for (const entityType of entityTypes) {
      const seed = SEEDERS[entityType]
      expect(seed, `no tag-semantics fixture for provider '${entityType}'`).toBeDefined()
      const h = await setup()
      const P = await h.spaces.createTag({ name: 'P' })
      const C = await h.spaces.createTag({ name: 'P/C', parent_tag_id: P.id })
      const X = await h.spaces.createTag({ name: 'X' })
      const Y = await h.spaces.createTag({ name: 'Y' })
      const tagId: Record<TagKey, string> = { P: P.id, C: C.id, X: X.id, Y: Y.id }
      const entityIds = await seed!(
        h,
        Object.fromEntries(Object.entries(FIXTURE).map(([k, keys]) => [k, keys.map((t) => tagId[t])])),
      )
      const keyOf = new Map(Object.entries(entityIds).map(([k, id]) => [id, k]))

      for (const c of CASES) {
        const toIds = (keys: TagKey[] | undefined) => keys?.map((t) => tagId[t])
        const tags: { any?: string[]; all?: string[]; none?: string[] } = {}
        if (c.tags.any) tags.any = toIds(c.tags.any)
        if (c.tags.all) tags.all = toIds(c.tags.all)
        if (c.tags.none) tags.none = toIds(c.tags.none)
        const view = await h.views.createView({
          name: c.name,
          layout: 'list',
          filter: { entity_types: [entityType], tags },
        })
        const resolved = await h.engine.resolve(view)
        expect(resolved.degraded, `${entityType} · ${c.name}`).toEqual([])
        const got = resolved.rows.map((r) => keyOf.get((r as { id: string }).id) ?? '?').sort()
        expect(got, `${entityType} · ${c.name}`).toEqual([...c.expect].sort())
      }
    }
  })

  it('VW-8 a parent_task_id conjunct at any depth lifts the Tasks top-level grain', async () => {
    // BR-TK-S7-8: top-level tasks only UNLESS an applied conjunct references `parent_task_id` — at any depth (inside an
    // `any` or `not` group too), not only a top-level comparison.
    const h = await setup()
    const parent = await h.svc.createTask({ title: 'parent' })
    const other = await h.svc.createTask({ title: 'other top-level' })
    const sub1 = await h.svc.addSubtask(parent.id, { title: 'sub 1' })
    const sub2 = await h.svc.addSubtask(parent.id, { title: 'sub 2' })
    const CASES: { name: string; where: ViewFilter['where']; expect: string[] }[] = [
      {
        name: 'not (parent_task_id eq null) = the sub-tasks',
        where: [{ not: { field: 'parent_task_id', op: 'eq', value: null } }],
        expect: [sub1.id, sub2.id],
      },
      {
        name: 'any [parent_task_id eq parent] = the sub-tasks',
        where: [{ any: [{ field: 'parent_task_id', op: 'eq', value: parent.id }] }],
        expect: [sub1.id, sub2.id],
      },
      {
        name: 'any [parent_task_id eq null, parent_task_id eq parent] = every task',
        where: [
          {
            any: [
              { field: 'parent_task_id', op: 'eq', value: null },
              { field: 'parent_task_id', op: 'eq', value: parent.id },
            ],
          },
        ],
        expect: [parent.id, other.id, sub1.id, sub2.id],
      },
    ]
    for (const c of CASES) {
      const view = await h.views.createView({
        name: c.name,
        layout: 'list',
        filter: { entity_types: ['task'], where: c.where },
      })
      expect(ids((await h.engine.resolve(view)).rows), c.name).toEqual([...c.expect].sort())
    }
  })

  it('VW-8 the Tasks provider evaluates between, in, any, not and exists, and ignores an unknown-field conjunct', async () => {
    const h = await setup()
    const a = await h.svc.createTask({ title: 'a', due_date: '2026-03-05', priority: 'high' })
    const b = await h.svc.createTask({ title: 'b', due_date: '2026-03-15', status: 'in_progress' })
    const c = await h.svc.createTask({ title: 'c (no due date)' })
    const d = await h.svc.createTask({ title: 'd', due_date: '2026-04-10', status: 'in_progress' })
    const CASES: { name: string; where: ViewFilter['where']; expect: string[] }[] = [
      {
        name: 'between (inclusive) on due_date',
        where: [{ field: 'due_date', op: 'between', value: ['2026-03-05', '2026-03-15'] }],
        expect: [a.id, b.id],
      },
      {
        name: 'in on status',
        where: [{ field: 'status', op: 'in', value: ['in_progress', 'completed'] }],
        expect: [b.id, d.id],
      },
      {
        name: 'an any group = OR',
        where: [
          {
            any: [
              { field: 'priority', op: 'eq', value: 'high' },
              { field: 'due_date', op: 'gt', value: '2026-04-01' },
            ],
          },
        ],
        expect: [a.id, d.id],
      },
      {
        name: 'a not group negates',
        where: [{ not: { field: 'due_date', op: 'exists' } }],
        expect: [c.id],
      },
      { name: 'exists on due_date', where: [{ field: 'due_date', op: 'exists' }], expect: [a.id, b.id, d.id] },
      {
        name: 'an unknown-field conjunct is ignored; the other conjuncts still filter',
        where: [
          { field: 'status', op: 'eq', value: 'in_progress' },
          { field: 'nope', op: 'eq', value: 1 },
        ],
        expect: [b.id, d.id],
      },
    ]
    for (const cs of CASES) {
      const view = await h.views.createView({
        name: cs.name,
        layout: 'list',
        filter: { entity_types: ['task'], where: cs.where },
      })
      const resolved = await h.engine.resolve(view)
      expect(resolved.state, cs.name).toBe('success')
      expect(ids(resolved.rows), cs.name).toEqual([...cs.expect].sort())
    }
  })

  it('VW-8 a relative date resolves against the UTC day (todayYmd), not the device timezone', async () => {
    // Pinned at 2026-03-11T01:30Z: the UTC day is 2026-03-11, while in America/Sao_Paulo (UTC-3) it is still
    // 2026-03-10 22:30. Today's platform convention resolves `today` via todayYmd() = the UTC day (the user-timezone
    // resolution waits on user_profile.timezone), so `lte today+1` = `lte 2026-03-12`. A switch to the device/user day
    // would make this `lte 2026-03-11` and turn this test red — a visible change.
    const h = await setup()
    const d10 = await h.svc.createTask({ title: 'd10', due_date: '2026-03-10' })
    const d11 = await h.svc.createTask({ title: 'd11', due_date: '2026-03-11' })
    const d12 = await h.svc.createTask({ title: 'd12', due_date: '2026-03-12' })
    await h.svc.createTask({ title: 'd13', due_date: '2026-03-13' })
    const view = await h.views.createView({
      name: 'due by tomorrow',
      layout: 'list',
      filter: { entity_types: ['task'], where: [{ field: 'due_date', op: 'lte', value: { rel: 'today', days: 1 } }] },
    })
    const orig = process.env.TZ
    process.env.TZ = 'America/Sao_Paulo' // Node Date picks up TZ at runtime (the tasks S5 test-11 pattern)
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date('2026-03-11T01:30:00Z'))
      expect(new Date().getDate()).toBe(10) // the zone really is forced: the local day lags the UTC day
      const resolved = await h.engine.resolve(view)
      expect(ids(resolved.rows)).toEqual([d10.id, d11.id, d12.id].sort())
    } finally {
      vi.useRealTimers()
      if (orig === undefined) delete process.env.TZ
      else process.env.TZ = orig
    }
  })
})
