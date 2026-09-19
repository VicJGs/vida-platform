import { z } from 'zod'
import { INSTANTIATION_STATUS } from '@vida/types'

// Canonical validators for the templates engine (XS-templates #36 · ADR-009).
// z.enum over the @vida/types tuple — the single source (mirror validators/view.ts).
export const InstantiationStatusSchema = z.enum(INSTANTIATION_STATUS)

// Bundle ENVELOPE validator — validates the 5 FIXED members only (ADR-009:46-50);
// member CONTENTS are opaque authored JSON (z.unknown) — deeper per-member
// validation is S3's serializer concern (ADR-009:112-115). `seed_entities`/`views`
// are required by z.array; `root_tag` is forced required by the refine (a
// z.unknown() field is optional-by-default in Zod), grounded in spaces.root_tag_id
// being NOT NULL — a bundle with no root tag cannot seed a Space.
export const BundleSchema = z
  .object({
    root_tag: z.unknown(),
    seed_entities: z.array(z.unknown()),
    views: z.array(z.unknown()),
    enabled_blocks: z.unknown(),
    child_structure: z.unknown().optional(),
  })
  .refine(
    (d) => 'root_tag' in d && (d as { root_tag?: unknown }).root_tag !== undefined,
    { message: 'root_tag is required', path: ['root_tag'] },
  )
