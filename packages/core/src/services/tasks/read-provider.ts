// services/tasks — the tasks ReadProvider (mod-tasks #65 · S8 · LIF-703)
//
// Tasks AS a `ReadProvider` (ADR-007 §3.4 / XCU-07/08) over the §3.6 filter grammar (VW-8), plus the day, status and
// tag-reader helpers it shares with the service closure. Imports nothing from ./service (service.ts imports and
// re-exports from here), so there is no module cycle.

import { and, eq, isNull } from 'drizzle-orm'
import { createRepository } from '../../db/repository'
// The foundation `tags` row (live-tag guard + nested expansion) and the `entity_tags` junction (raw READ only; writes go
// through SpacesService). Foundation schema, not another module's (C5/TK-9 gate).
import { tags, entityTags } from '../../db/schema/foundation/spaces'
import type { DrizzleDb } from '../../db/adapter'
import type { TaskRow } from '../../db/schema/tasks'
import { compileWhere, normalizeViewFilter, type ViewProviderRegistry } from '../../foundation/views'
import { matchesTagClause, resolveTagClause, tagClauseIds, type ReadProvider } from '../../foundation/views'
import type { Clause, FilterAliases, Literal, WhereField } from '../../foundation/views'
import { ListTasksFilterFieldsSchema } from '../../validators/task'
import type { TasksService } from './types'

// ---- day + status helpers (shared with the service closure) -----------------
/** Unix ms → the UTC calendar day `YYYY-MM-DD` — the platform's shipped convention for "the date" of a timestamp
 *  (habits `clock`, finance, books, check-ins, purposes, relationships all derive a day as `toISOString().slice(0,10)`;
 *  `cross-module-integration.md:70` writes `date(started_at)` for the same). Timezone-INDEPENDENT by construction. When
 *  the designed `user_profile.timezone` (ADR-002:3381, unbuilt) lands, this is the one seam to re-point.
 *  Precondition: a finite ms (`toISOString` throws RangeError on NaN/±Infinity) — the only caller passes a stored
 *  `completed_at`, which is always a `Date.now()` stamp. */
export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Today as YYYY-MM-DD — the anchor fallback for a null `due_date` (BR-TK-S5-3). The UTC calendar day: the platform
 *  convention for "the day of a timestamp" (`utcDay` above — habits' `clock`, finance, books, check-ins, purposes,
 *  relationships; ADR-002:62 / `user_profile.timezone DEFAULT 'UTC'`). Re-pointed from a LOCAL day at S9 (§XXVIII):
 *  the S5 local choice was a review-time decision, not doc-grounded, and made tasks the only local-day helper in core. */
export function todayYmd(): string {
  return utcDay(Date.now())
}

/** The shared `STATUS` enum's TERMINAL set (`@vida/types` common.ts:32) — the platform convention: projects:71 ·
 *  purposes:81 · sessions; projects intake G9 "archived = completed/cancelled". `on_hold` is NOT terminal (paused, still
 *  owed). "Open" work = status ∉ this set (the S9 lane + the `open` list filter). */
export const TERMINAL_STATUSES: ReadonlySet<string> = new Set(['completed', 'cancelled'])

// ---- the tasks ReadProvider (XCU-07/08) ---------------------------------------

export const TASK_ENTITY_TYPE = 'task'

/** Read-only readers over the foundation tag tables (M1.0 empty-[E] pass-through; `softDelete:true` so `findById`/
 *  `findAll` filter soft-deletes — `findWhere` does NOT). Shared by the service closure and the ReadProvider. */
export function createTagReaders(db: DrizzleDb, deviceId: string) {
  const cfg = { deviceId, softDelete: true, encryptedFields: [] as string[] }
  return { tagsRepo: createRepository(db, tags, cfg), entityTagRepo: createRepository(db, entityTags, cfg) }
}

/** ADR-007:57 — `tags` means membership **incl. nested** (ADR-006: `#a ⊃ #a/b`, a Space's contents = everything
 *  carrying the root tag). Returns an expander of requested ids to the LIVE ones among them ∪ all their LIVE
 *  descendants: one read of the live `tags` rows (shared by every key of a TagClause), then a worklist walk (stack)
 *  over `parent_tag_id` with a `seen` set (cycle-safe even though BR-3 forbids cycles on write). ONLY live nodes expand — a soft-deleted node, whether requested (a view saved
 *  on `#x` after `#x` was deleted) or intermediate, STOPS the walk and contributes nothing; an unknown id likewise
 *  matches nothing. (Spaces has no delete-reparent rule; `deleteTag` does not cascade the junction, so a dead tag's
 *  stale `entity_tags` rows must not resurrect membership — g2 F2.) */
async function loadTagExpander(
  tagsRepo: ReturnType<typeof createTagReaders>['tagsRepo'],
): Promise<(ids: readonly string[]) => Set<string>> {
  const live = await tagsRepo.findAll()
  const liveIds = new Set(live.map((t) => t.id))
  const children = new Map<string, string[]>()
  for (const t of live) {
    if (t.parent_tag_id == null) continue
    const bucket = children.get(t.parent_tag_id) ?? []
    bucket.push(t.id)
    children.set(t.parent_tag_id, bucket)
  }
  return (ids) => {
    const seen = new Set<string>()
    const worklist = ids.filter((id) => liveIds.has(id))
    while (worklist.length > 0) {
      const id = worklist.pop()
      if (id === undefined) break
      if (seen.has(id)) continue
      seen.add(id)
      for (const child of children.get(id) ?? []) worklist.push(child) // children of a live node are live by construction
    }
    return seen
  }
}

/** Tasks' legacy `predicates` aliases (ADR-007 §3.6.4): `due_before` reads as `due_date lt` — STRICT (the ADR's
 *  mapping; `listTasks`' own `due_before` stays inclusive). Folds into `capabilities.aliases` at LIF-704. */
const TASKS_FILTER_ALIASES = { due_before: { field: 'due_date', op: 'lt' } } as const satisfies FilterAliases

const F = ListTasksFilterFieldsSchema.shape
const accepts =
  (schema: { safeParse(v: unknown): { success: boolean } }) =>
  (v: Literal): boolean =>
    schema.safeParse(v).success

/** The fields the tasks provider applies `where` conjuncts on (XCU-13: apply what it understands, ignore the rest);
 *  a value the field's schema rejects leaves the conjunct unapplied. `open`/`completed` are derived from `status`. */
const TASK_WHERE_FIELDS: Readonly<Record<string, WhereField<TaskRow>>> = {
  id: { read: (t) => t.id, accepts: (v) => typeof v === 'string' },
  status: { read: (t) => t.status, accepts: accepts(F.status) },
  priority: { read: (t) => t.priority, accepts: accepts(F.priority) },
  kind: { read: (t) => t.kind, accepts: accepts(F.kind) },
  project_id: { read: (t) => t.project_id, accepts: accepts(F.project_id) },
  parent_task_id: { read: (t) => t.parent_task_id, accepts: accepts(F.parent_task_id) },
  due_date: { read: (t) => t.due_date, accepts: accepts(F.due_before) },
  completed: { read: (t) => t.status === 'completed', accepts: (v) => typeof v === 'boolean' },
  open: { read: (t) => !TERMINAL_STATUSES.has(t.status), accepts: (v) => typeof v === 'boolean' },
}

const isFieldClause = (c: Clause, field: string): c is Extract<Clause, { field: string }> =>
  'field' in c && c.field === field

/** Does a clause reference `field` at any depth (a comparison, or one nested in an `any`/`not` group)? */
function referencesField(c: Clause, field: string): boolean {
  if ('field' in c) return c.field === field
  if ('any' in c) return c.any.some((x) => referencesField(x, field))
  return referencesField(c.not, field)
}

/**
 * Tasks as a `ReadProvider` (ADR-007 §3.4 / XCU-07/08) — the OTHER direction of the seam S7 consumed: saved views fan
 * out OVER tasks through this documented read API (INT-1, never a table read). Per ADR-007 §3.3.4 / XCU-13 the
 * provider applies the conjuncts it understands and IGNORES the rest; it never throws for a bad conjunct. The filter
 * is read through `normalizeViewFilter` (ADR-007 §3.6.4 — a pre-grammar `tags`/`predicates` row still filters). Rules:
 *   1. a top-level `id eq` conjunct SHORT-CIRCUITS → `[getTask(id)]` (a sub-task IS returned by id; tags/grain/other
 *      conjuncts skipped); a non-string id matches nothing.
 *   2. `where` conjuncts on `TASK_WHERE_FIELDS` are applied (an `any`/`not` group whole or not at all); unknown or
 *      `@role` fields and invalid values are ignored. Relative dates resolve against `todayYmd()`.
 *   3. grain = TOP-LEVEL tasks unless an applied conjunct references `parent_task_id` at any depth, inside an
 *      `any`/`not` group too (BR-TK-S7-8).
 *   4. `tags` = the shared TagClause semantics (`resolveTagClause`/`matchesTagClause`): nested, any/all/none.
 *   5. returns `TaskRow[]`, soft-deleted excluded (via `listTasks`).
 * Takes `db`/`deviceId` like `registerTasksTimer` — the membership read is a raw foundation-junction scan.
 */
export function createTasksReadProvider(deps: { svc: TasksService; db: DrizzleDb; deviceId: string }): ReadProvider {
  const { svc, db, deviceId } = deps
  const { tagsRepo, entityTagRepo } = createTagReaders(db, deviceId)
  return {
    entityType: TASK_ENTITY_TYPE,
    async list(stored) {
      const filter = normalizeViewFilter(stored, TASKS_FILTER_ALIASES)
      const where = filter.where ?? []
      const byId = where.find((c) => isFieldClause(c, 'id') && c.op === 'eq')
      if (byId !== undefined && 'value' in byId) {
        // By-id short-circuit. A present-but-non-string id can match nothing — return nothing rather than fall through
        // to "all top-level tasks" (g2 F4; XCU-13 "ignore" would be surprising for an identity predicate).
        if (typeof byId.value !== 'string') return []
        const t = await svc.getTask(byId.value)
        return t ? [t] : []
      }
      const compiled = compileWhere(where, TASK_WHERE_FIELDS, { today: todayYmd() })
      const topLevelOnly = !compiled.applied.some((c) => referencesField(c, 'parent_task_id')) // BR-TK-S7-8
      let rows = (await svc.listTasks()).filter((t) => (!topLevelOnly || t.parent_task_id == null) && compiled.test(t))
      const tagClause = filter.tags ? resolveTagClause(filter.tags, await loadTagExpander(tagsRepo)) : null
      if (tagClause !== null) {
        const wanted = tagClauseIds(tagClause)
        // One junction scan + a JS Set (the listTasks JS-filter precedent) — not inArray(), which hits SQLite's
        // bound-variable cap on a wide hierarchy.
        const members = await entityTagRepo.findWhere(
          and(eq(entityTags.entity_type, TASK_ENTITY_TYPE), isNull(entityTags.deleted_at))!,
        )
        const tagsOf = new Map<string, Set<string>>()
        for (const m of members) {
          if (!wanted.has(m.tag_id)) continue
          const set = tagsOf.get(m.entity_id) ?? new Set<string>()
          set.add(m.tag_id)
          tagsOf.set(m.entity_id, set)
        }
        const none = new Set<string>()
        rows = rows.filter((t) => matchesTagClause(tagClause, tagsOf.get(t.id) ?? none))
      }
      return rows
    },
  }
}

/** Composition wiring (NOT a service method — the `registerTasksTimer` shape): register tasks into the SHARED
 *  `ViewProviderRegistry` keyed `'task'`; re-registration replaces (registry semantics). No composition root at M1. */
export function registerTasksReadProvider(
  providers: ViewProviderRegistry,
  deps: { svc: TasksService; db: DrizzleDb; deviceId: string },
): void {
  providers.register(createTasksReadProvider(deps))
}
