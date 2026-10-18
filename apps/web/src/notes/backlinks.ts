// ============================================================================
// backlinks — the pure merge + group core for "what links here" (fe-notes-and-pages
// #27, S3). The ① `getBacklinks` returns TWO unmerged, ids-only lists (BR-S4-4);
// the G6 merge + group-by-source-module is the UI's job (EC-6). This module is
// PURE (no React, no @vida/core, no note-chrome) so it unit-tests in isolation.
//
// Both backlink sources are PAGES (pageLinks via source_page_id, entityLinks via
// page_id — backlink-resolver.ts:46). The source's TYPE/TITLE is not in the link
// row, so the caller injects a `resolve` fn; live resolution rides the data plane
// (D-S3-1, the S1-D2/S2 stub cause). An unresolved source is omitted.
// ============================================================================
import type { PageType } from '@vida/types'

/** Structural projections of the ① Row types (the `PageLike` precedent, page-binding.ts:16) —
 *  getBacklinks' `PageLinkRow`/`EntityLinkRow` results are structurally assignable to these. */
export interface PageLinkLike {
  source_page_id: string
  context: string | null
  created_at: number
}
export interface EntityLinkLike {
  page_id: string
  context: string | null
  created_at: number
}

/** A resolved source page — the resolver's output (live resolution deferred, D-S3-1). */
export interface BacklinkSource {
  id: string
  type: PageType | string
  title: string
}
export type ResolveSource = (sourceId: string) => BacklinkSource | null

export interface BacklinkItem {
  sourceId: string
  type: PageType | string
  title: string
  /** Owning module, derived via `moduleForType` (the EC-6 grouping key). */
  module: string
  /** Occurrences from this source (≥1) — surfaced, never silently dropped (D-S3-3). */
  count: number
  /** First non-empty `context` snippet; per-occurrence lists deferred (snippets are [E]/inert in M1). */
  snippet: string | null
  /** Most-recent occurrence `created_at` (ms) — drives the recency sort. */
  latest: number
}
export interface BacklinkGroup {
  module: string
  items: BacklinkItem[]
}

/** Source page type → owning module (EC-6 / D-S3-2). Total over `PageType`. */
export const MODULE_FOR_TYPE: Record<PageType, string> = {
  note: 'Notes',
  journal: 'Journals',
  task_note: 'Tasks',
  task_group_note: 'Tasks',
  milestone_note: 'Projects',
  deliverable_note: 'Projects',
}

export function moduleForType(type: string): string {
  // Every backlink source is a page → `type` is always a PageType → the map is total;
  // the raw-string fallback is defensive only (keeps this module dependency-free — G1).
  return (MODULE_FOR_TYPE as Record<string, string>)[type] ?? type
}

interface Agg {
  count: number
  snippet: string | null
  latest: number
}

/** Fold both ① lists → one item per SOURCE (dedup), occurrences counted. Unresolved sources omitted. */
export function mergeBacklinks(
  raw: { pageLinks: PageLinkLike[]; entityLinks: EntityLinkLike[] },
  resolve: ResolveSource,
): BacklinkItem[] {
  const acc = new Map<string, Agg>()
  const bump = (sourceId: string, context: string | null, createdAt: number): void => {
    const cur = acc.get(sourceId) ?? { count: 0, snippet: null, latest: 0 }
    cur.count += 1
    if (cur.snippet === null && context !== null && context !== '') cur.snippet = context
    if (createdAt > cur.latest) cur.latest = createdAt
    acc.set(sourceId, cur)
  }
  for (const link of raw.pageLinks) bump(link.source_page_id, link.context, link.created_at)
  for (const link of raw.entityLinks) bump(link.page_id, link.context, link.created_at)

  const items: BacklinkItem[] = []
  for (const [sourceId, agg] of acc) {
    const src = resolve(sourceId)
    // null → omit: without a resolved type/title the row can't be named or grouped (the honest-empty
    // mechanism in M1; a live deleted-source "Unknown" fallback is a deferred data-plane edge).
    if (src === null) continue
    items.push({
      sourceId,
      type: src.type,
      title: src.title,
      module: moduleForType(src.type),
      count: agg.count,
      snippet: agg.snippet,
      latest: agg.latest,
    })
  }
  return items
}

/** Group items by module; items recency-desc (title tie-break); groups by module name asc. */
export function groupBySourceModule(items: BacklinkItem[]): BacklinkGroup[] {
  const byModule = new Map<string, BacklinkItem[]>()
  for (const it of items) {
    const arr = byModule.get(it.module)
    if (arr === undefined) byModule.set(it.module, [it])
    else arr.push(it)
  }
  const groups: BacklinkGroup[] = []
  for (const [module, arr] of byModule) {
    arr.sort((a, b) => b.latest - a.latest || a.title.localeCompare(b.title))
    groups.push({ module, items: arr })
  }
  groups.sort((a, b) => a.module.localeCompare(b.module))
  return groups
}
