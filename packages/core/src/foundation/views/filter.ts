// ============================================================================
// View filter grammar — read path + shared evaluation  (LIF-703 · ADR-007 §3.6, VW-8)
//
// One home for what every ReadProvider must do the same way:
//   • normalizeViewFilter — the §3.6.4 compatibility read: a stored `tags: string[]` reads as `{ any }`, a stored
//     `predicates: { k: v }` as one `eq` conjunct per key, except the provider's declared aliases.
//   • resolveTagClause / matchesTagClause — §3.6.1 tags: nested membership, any ∪, all ∩, none ∖, ANDed.
//   • compileWhere — §3.6.2 conjuncts over the fields a provider declares; a conjunct it can't apply (unknown or
//     `@role` field, bad op, bad value) is IGNORED whole for that type (§3.3.4 / §3.7.2 — never half-evaluated).
// ============================================================================

import { VIEW_FILTER_OP } from '@vida/types'
import type {
  Clause,
  Comparison,
  FilterAliases,
  Literal,
  Op,
  RelativeDate,
  TagClause,
  Value,
  ViewFilter,
} from './types'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function strings(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined
}

function isOp(v: unknown): v is Op {
  return typeof v === 'string' && (VIEW_FILTER_OP as readonly string[]).includes(v)
}

/** Structural check of a stored clause; a malformed one is dropped by the read (it can't be applied anyway). */
function isClause(v: unknown): v is Clause {
  if (!isRecord(v)) return false
  if ('field' in v) return typeof v.field === 'string' && isOp(v.op)
  if ('any' in v) return Array.isArray(v.any) && v.any.every(isClause)
  if ('not' in v) return isClause(v.not)
  return false
}

function readTags(v: unknown): TagClause | undefined {
  if (Array.isArray(v)) {
    const any = strings(v) ?? []
    return any.length > 0 ? { any } : undefined // §3.6.4 — `tags: string[]` reads as `{ any }`
  }
  if (!isRecord(v)) return undefined // anything else is not a tag filter
  const out: TagClause = {}
  for (const k of ['any', 'all', 'none'] as const) {
    const ids = strings(v[k])
    if (ids !== undefined) out[k] = ids
  }
  return out
}

/**
 * Read a stored filter (grammar or pre-grammar) as the §3.6 grammar. Tolerant: never throws; a non-object reads as
 * "no filter". `aliases` are the reading provider's legacy `predicates` keys (§3.6.4).
 */
export function normalizeViewFilter(raw: unknown, aliases: FilterAliases = {}): ViewFilter {
  if (!isRecord(raw)) return { entity_types: [] }
  const filter: ViewFilter = { entity_types: strings(raw.entity_types) ?? [] }
  const tags = readTags(raw.tags)
  if (tags !== undefined) filter.tags = tags
  const where: Clause[] = Array.isArray(raw.where) ? raw.where.filter(isClause) : []
  if (isRecord(raw.predicates)) {
    for (const [key, value] of Object.entries(raw.predicates)) {
      const alias = Object.hasOwn(aliases, key) ? aliases[key] : undefined
      where.push({ field: alias?.field ?? key, op: alias?.op ?? 'eq', value: value as Value })
    }
  }
  if (where.length > 0) filter.where = where
  if (typeof raw.exclude_unsupported === 'boolean') filter.exclude_unsupported = raw.exclude_unsupported
  const lanes = strings(raw.lanes)
  if (lanes !== undefined) filter.lanes = lanes
  return filter
}

// ---- tags (§3.6.1) -----------------------------------------------------------

/** A TagClause with every id expanded to its nested membership set. `null` from `resolveTagClause` = no tag filter. */
export interface ResolvedTagClause {
  any?: ReadonlySet<string>
  all?: ReadonlySet<string>[]
  none?: ReadonlySet<string>
}

/**
 * Expand a TagClause through the provider's nested-tag expander (ids → the live ids ∪ their live descendants).
 * An empty or absent key filters nothing; a clause with no non-empty key resolves to `null`.
 */
export function resolveTagClause(
  clause: TagClause | undefined,
  expand: (ids: readonly string[]) => ReadonlySet<string>,
): ResolvedTagClause | null {
  if (clause === undefined) return null
  const out: ResolvedTagClause = {}
  if (clause.any && clause.any.length > 0) out.any = expand(clause.any)
  if (clause.all && clause.all.length > 0) out.all = clause.all.map((id) => expand([id]))
  if (clause.none && clause.none.length > 0) out.none = expand(clause.none)
  return out.any || out.all || out.none ? out : null
}

/** The tag ids an entity's membership must be read for (one junction scan, filtered to these). */
export function tagClauseIds(resolved: ResolvedTagClause): Set<string> {
  const ids = new Set<string>(resolved.any)
  for (const s of resolved.all ?? []) for (const id of s) ids.add(id)
  for (const id of resolved.none ?? []) ids.add(id)
  return ids
}

/** Does an entity carrying `entityTagIds` (its direct tags) satisfy the resolved clause? */
export function matchesTagClause(resolved: ResolvedTagClause, entityTagIds: ReadonlySet<string>): boolean {
  const hits = (set: ReadonlySet<string>): boolean => {
    for (const id of entityTagIds) if (set.has(id)) return true
    return false
  }
  if (resolved.any && !hits(resolved.any)) return false
  if (resolved.all && !resolved.all.every(hits)) return false
  if (resolved.none && hits(resolved.none)) return false
  return true
}

// ---- where (§3.6.2 / §3.6.3) -------------------------------------------------

/** One field a provider can filter on: how to read it from a row, and which literals are valid for it. */
export interface WhereField<Row> {
  read(row: Row): Literal
  /** A literal this field can be compared with (default: any literal). An invalid value makes the conjunct unapplied. */
  accepts?(value: Literal): boolean
}

export interface WhereContext {
  /** Today as `YYYY-MM-DD` — the provider's day convention, the anchor for relative dates (§3.6.3). */
  today: string
}

export interface CompiledWhere<Row> {
  test(row: Row): boolean
  /** Conjuncts the provider applies. */
  applied: Clause[]
  /** Conjuncts ignored for this type (§3.3.4); naming them in `degraded` is LIF-704. */
  ignored: Clause[]
}

const DAY_MS = 86_400_000

function isRelativeDate(v: unknown): v is RelativeDate {
  return (
    isRecord(v) &&
    v.rel === 'today' &&
    (v.days === undefined || (typeof v.days === 'number' && Number.isInteger(v.days)))
  )
}

function isLiteral(v: unknown): v is Literal {
  return v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
}

/** A relative date → `YYYY-MM-DD` from `today` (calendar-day arithmetic on a UTC-parsed day, so no DST drift). */
function resolveScalar(v: unknown, ctx: WhereContext): Literal | undefined {
  if (isRelativeDate(v)) {
    const base = Date.parse(`${ctx.today}T00:00:00Z`)
    if (Number.isNaN(base)) return undefined
    return new Date(base + (v.days ?? 0) * DAY_MS).toISOString().slice(0, 10)
  }
  return isLiteral(v) ? v : undefined
}

type Test<Row> = (row: Row) => boolean

const ordered = (v: Literal): v is string | number => typeof v === 'string' || typeof v === 'number'

function compileComparison<Row>(
  c: Comparison,
  fields: Readonly<Record<string, WhereField<Row>>>,
  ctx: WhereContext,
): Test<Row> | null {
  if (!Object.hasOwn(fields, c.field)) return null // unknown or `@role` field (roles are §3.8)
  const spec = fields[c.field]!
  const ok = (v: Literal): boolean => (spec.accepts ? spec.accepts(v) : true)
  const read = spec.read.bind(spec)
  if (c.op === 'exists') return (row) => read(row) != null
  if (c.op === 'in' || c.op === 'between') {
    if (!Array.isArray(c.value)) return null
    const list = c.value.map((v) => resolveScalar(v, ctx))
    if (list.some((v) => v === undefined || !ok(v))) return null
    const vals = list as Literal[]
    if (c.op === 'in') return (row) => vals.includes(read(row))
    const [lo, hi] = vals
    if (vals.length !== 2 || lo == null || hi == null || !ordered(lo) || typeof lo !== typeof hi) return null
    return (row) => {
      const a = read(row)
      return a != null && typeof a === typeof lo && a >= lo && a <= (hi as typeof lo)
    }
  }
  const v = resolveScalar(c.value, ctx)
  if (v === undefined || !ok(v)) return null
  switch (c.op) {
    case 'eq':
      return (row) => read(row) === v
    case 'ne':
      return (row) => read(row) !== v
    case 'contains':
      if (typeof v !== 'string') return null
      return (row) => {
        const a = read(row)
        return typeof a === 'string' && a.includes(v)
      }
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte': {
      if (!ordered(v)) return null
      const op = c.op
      return (row) => {
        const a = read(row)
        if (a == null || typeof a !== typeof v) return false
        if (op === 'lt') return a < v
        if (op === 'lte') return a <= v
        if (op === 'gt') return a > v
        return a >= v
      }
    }
  }
  return null
}

function compileClause<Row>(
  clause: Clause,
  fields: Readonly<Record<string, WhereField<Row>>>,
  ctx: WhereContext,
): Test<Row> | null {
  if ('field' in clause) return compileComparison(clause, fields, ctx)
  if ('any' in clause) {
    const parts = clause.any.map((c) => compileClause(c, fields, ctx))
    if (parts.some((p) => p === null)) return null // a group is applied whole or ignored whole (§3.7.2)
    return (row) => parts.some((p) => p!(row))
  }
  const inner = compileClause(clause.not, fields, ctx)
  return inner === null ? null : (row) => !inner(row)
}

/** Compile `where` (AND of conjuncts) against the fields a provider understands. */
export function compileWhere<Row>(
  where: readonly Clause[] | undefined,
  fields: Readonly<Record<string, WhereField<Row>>>,
  ctx: WhereContext,
): CompiledWhere<Row> {
  const tests: Test<Row>[] = []
  const applied: Clause[] = []
  const ignored: Clause[] = []
  for (const clause of where ?? []) {
    const t = compileClause(clause, fields, ctx)
    if (t === null) ignored.push(clause)
    else {
      tests.push(t)
      applied.push(clause)
    }
  }
  return { test: (row) => tests.every((t) => t(row)), applied, ignored }
}
