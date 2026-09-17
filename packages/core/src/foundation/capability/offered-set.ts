// ============================================================================
// OfferedSetResolver — the per-surface-per-Space capability palette (XS-capability #31 · S3)
//
// XCU-SP-29 teeth-split: `inline` contributes ADDITIVELY (union — a page may belong to many
// Spaces, so inline is non-restrictive), `standalone` is RESTRICTED to the Space's enabled
// palette (`space_enabled_blocks`). Service half only — the add-menu/slash-menu UI is P6.
// Read-only; graceful on a stale palette ref (a def that no longer exists is simply excluded).
// ============================================================================

import { and, eq, isNull } from 'drizzle-orm'
import type { RenderTarget } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import { spaceEnabledBlocks } from '../../db/schema/foundation/spaces'
import type { CapabilityRegistry } from './registry'
import type { CapabilityDefinition } from './types'

export interface OfferedSetResolver {
  /** The capabilities offered on `surface` within `spaceId`: inline=union, standalone=restricted. */
  resolveOfferedSet(spaceId: string, surface: RenderTarget): Promise<CapabilityDefinition[]>
}

export function createOfferedSetResolver(
  db: DrizzleDb,
  registry: CapabilityRegistry,
): OfferedSetResolver {
  async function resolveOfferedSet(
    spaceId: string,
    surface: RenderTarget,
  ): Promise<CapabilityDefinition[]> {
    const all = await registry.list()

    if (surface === 'inline') {
      // Union — non-restrictive; every inline-capable def, regardless of Space (XCU-SP-29).
      return all.filter((d) => d.render_targets.includes('inline'))
    }

    // standalone — restrict to the Space's enabled palette (space_enabled_blocks, active only).
    const rows = (await db
      .select()
      .from(spaceEnabledBlocks)
      .where(and(eq(spaceEnabledBlocks.space_id, spaceId), isNull(spaceEnabledBlocks.deleted_at)))
      .all()) as { capability_def_id: string }[]
    const palette = new Set(rows.map((r) => r.capability_def_id))
    // A palette ref to a non-existent def is simply excluded (graceful — no throw).
    return all.filter((d) => palette.has(d.id) && d.render_targets.includes('standalone'))
  }

  return { resolveOfferedSet }
}
