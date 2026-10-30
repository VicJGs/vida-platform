# IMPLEMENTATION-PLAN — xs-templates S1 (§XXVI gate 2 = build-steps)

Status: draft (gate 2). Executes the approved SPEC `PLAN-2026-09-19-S1-types.md` §1–§4. Every step cites a spec
rule; nothing invented at build time. Ground rule: no shape beyond the spec's envelope (Victor drift directive).
Env: Node 24 via nvm + corepack pnpm. Branch `xs-templates`.

## Grounding note folded from gate-2 prep

`INSTANTIATION_STATUS` has **no table column / no SQL CHECK** (it is a runtime result type, not persisted) →
it is **NOT** added to `validators/enum-parity.test.ts` (that fixture is SQL-CHECK↔tuple only,
enum-parity.test.ts:1-11). Its parity (tuple ≡ `z.enum`) is asserted in the S1 validator test instead. `[FACT: enum-parity.test.ts:8-11; templates.ts has no status column]`

## Build steps (ordered)

1. **`packages/types/src/template.ts`** — create. `INSTANTIATION_STATUS` `as const` tuple + `InstantiationStatus`
   alias; the `TemplateBundle` envelope (5 members, each `unknown`/`unknown[]`, doc-commented with source +
   "shape → S3 serializer"). Mirror `view.ts` header/comment style. → SPEC §3 (BR-S1-1/2/3/4).
2. **`packages/types/src/index.ts`** — add `export * from './template'` (alphabetically near `view`/`note`). → SPEC §4 (re-export).
3. **`packages/core/src/foundation/templates/types.ts`** — create. `FlaggedMember { member: string; reason: string }`,
   `InstantiationResult { status; seeded; flagged }`, `TemplateNotFound`, `TemplateCaptureError` (extend `Error`,
   `.name`, readonly field), import `InstantiationStatus` from `@vida/types`. Mirror `foundation/views/types.ts:52-66`
   error pattern. → SPEC §3 (BR-S1-5/6).
4. **`packages/core/src/foundation/templates/index.ts`** — create with `export * from './types'` (S2–S5 append
   service/capture/instantiate/shipped later). Mirror `foundation/views/index.ts`. → module barrel.
5. **`packages/core/src/validators/template.ts`** — create. `import { z } from 'zod'` + `INSTANTIATION_STATUS`,
   `TemplateBundle` from `@vida/types`. `export const InstantiationStatusSchema = z.enum(INSTANTIATION_STATUS)`
   (mirror `validators/view.ts`). `export const BundleSchema = z.object({ root_tag: z.unknown(), seed_entities:
z.array(z.unknown()), views: z.array(z.unknown()), enabled_blocks: z.unknown(), child_structure: z.unknown().optional() })
.refine((d) => 'root_tag' in d && (d as { root_tag?: unknown }).root_tag !== undefined, { message: 'root_tag is required', path: ['root_tag'] })`
   — **envelope only**. `seed_entities`/`views` are required by `z.array` (not optional); `root_tag` is forced
   required by the `.refine` (a `z.unknown()` field is optional-by-default in Zod, so the refine gives the "missing
   root_tag" test teeth). `root_tag` required is grounded: `spaces.root_tag_id` is `notNull` — a bundle with no
   root tag cannot seed a Space. → SPEC §3 (BR-S1-7/1). `[FACT: spaces.ts:86 root_tag_id notNull; Zod z.unknown optional-default]`
6. **`packages/core/src/validators/index.ts`** — add `export * from './template'`. → SPEC §4 (re-export).
7. **`packages/core/src/foundation/templates/__tests__/types.test.ts`** — create. Cases:
   (a) `BundleSchema` parses a minimal envelope `{root_tag:{}, seed_entities:[], views:[], enabled_blocks:{}}` and
   a populated one; **rejects** `{}` (missing `root_tag`). (b) `INSTANTIATION_STATUS` ≡ `InstantiationStatusSchema.options`
   (tuple≡z.enum parity). (c) `new TemplateNotFound('x').name === 'TemplateNotFound'` + `.templateId==='x'`; same for
   `TemplateCaptureError.reason`. → SPEC §4.
8. **Verify** (S1 Verification Gate): `corepack pnpm --filter @vida/types typecheck` → `--filter @vida/core typecheck`
   → `--filter @vida/core test`. Expect tsc 0 + **893 prior + new S1 tests** green. If `@vida/core` resolves
   `@vida/types` from built dist (not source), run `--filter @vida/types build` first (fold — [[first-runtime-consumer-surfaces-latent-barrel-defects]]).

## Deviation

Any divergence from these steps → §XXVIII (STOP → /critique → /preflight → Approval → re-impl). Update this plan +
task `## Build Steps` in lockstep.

## Done-check

SPEC §4 Acceptance all ticked → S1 done → S2 (store CRUD). §XXIX (spaces current-\*) runs at HEAD close, not per-slice.
