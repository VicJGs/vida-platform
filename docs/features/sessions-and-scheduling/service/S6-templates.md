<!-- S6 forward spec — MOD-sessions ① · slice S6 (session_templates CRUD). The §XXVI g1 gate object.
     Focus presets (PD-3). REFERENCES aspects + S1/S3/S4 + _index. No-Guessing. -->

# S6 — session_templates CRUD (forward spec · g1)

**Home:** extends `services/sessions/service.ts`. One new repo over `session_templates`. No new factory deps.
Independent CRUD (build-order swap: before S5). S3's `resolveFocusConfig` already READS a template row; S6
adds its CRUD.

## §1 Operations (return the row; signatures → `delivery/seam-contract.md`)
- `createTemplate(input): SessionTemplate` — create a focus preset (`name` required).
- `updateTemplate(id, patch): SessionTemplate` — patch preset fields.
- `deleteTemplate(id): void` — **hard delete** (no `deleted_at`; syncs `operation:'delete'`).
- `listTemplates(): SessionTemplate[]` — all presets.
- `setDefaultTemplate(id): void` — mark `id` default, unset every other (single-winner, PD-3 / contract.md:40).

## §2 Operation-flow & invariants
- **Repo (nuance-1):** `session_templates` → `{deviceId, encryptedFields:[], softDelete:false}` — **no
  `deleted_at`** (bare `...baseColumns`); `deleteTemplate` = hard delete. `name`/`description` `[E]` pass through
  the M1.0 seam (nuance-3). `[FACT: scheduling.ts:91; migration 014:176-202]`
- **Validation (IR-5, fail-loud, typed `InvalidSessionInput(field)`):** `name` non-empty; `work_minutes`,
  `short_break_minutes`, `long_break_minutes`, `intervals_before_long_break` (if provided) integers ≥ 1;
  `usage_count` (if provided) ≥ 0. No DDL CHECK exists (all plain `INTEGER NOT NULL DEFAULT`) → app-layer is the
  only guard; omitted fields fall to the DDL defaults (25/5/15/4, flags on/off). `[FACT: migration 014:176-202 — no CHECK]`
- **`is_default` single-winner (PD-3).** A hoisted `unsetOtherDefaults(exceptId)` closure sets `is_default=false`
  on every other template. `setDefaultTemplate(id)` = `unsetOtherDefaults(id)` then set `id` true.
  `createTemplate`/`updateTemplate` with `is_default:true` also run `unsetOtherDefaults` (so at most one default
  ever). Sequential best-effort (no cross-row tx — eventual consistency, same stance as the soft-delete cascade).
- **Reads** decrypt-on-read; every mutation enqueues `sync_queue`.

## §3 Contract (delta)
Adds the 5 methods to `SessionsService`. `TemplateInput` (name + optional preset fields), `TemplatePatch`,
`SessionTemplate` = the row type. Reuses `InvalidSessionInput`. No new factory deps or typed errors.

## §4 Acceptance criteria (Verification Gate — live unlocked vault)
1. `createTemplate({name:'Deep Work', work_minutes:50})` writes a row (other fields = DDL defaults);
   `listTemplates` returns it; `sync_queue` enqueued.
2. `updateTemplate` patches a field; `deleteTemplate` hard-deletes (gone from `listTemplates`; `sync_queue`
   `operation:'delete'`).
3. Typed validation, no write: `name:''` → `InvalidSessionInput('name')`; `work_minutes:0` →
   `InvalidSessionInput('work_minutes')`.
4. **Single-winner:** `createTemplate({name:'A', is_default:true})` then `createTemplate({name:'B',
   is_default:true})` → only B is default (`listTemplates` shows exactly one `is_default:true`);
   `setDefaultTemplate(A.id)` → only A default.
5. **PD-3 separation:** a template with a distinct cadence exists, but the S3 runtime obeys `user_preferences`
   (→ defaults), NOT the template — proves templates are presets, not a runtime config source (PD-3).
6. `tsc` clean; full `@vida/core` suite green.

## §5 Implementation prompt (order)
1. `types.ts` — `TemplateInput`, `TemplatePatch`, `SessionTemplate` (= `SessionTemplateRow`).
2. `validators/session.ts` — `TemplateSchema` + `TemplatePatchSchema` (name non-empty; minutes/intervals ≥ 1).
3. `service.ts` — `templateRepo` (already added in S3 for `resolveFocusConfig` — reuse it) + a hoisted
   `unsetOtherDefaults(exceptId)` closure; the 5 methods.
4. `__tests__` — AC1–AC5 on a live vault.

## §6 Out of scope (homed)
`usage_count`/`last_used_at` **bump-on-use** → the UI/consumption side (`fe-sessions` selects a template) or a
later wire — S6 exposes the fields via CRUD but does not auto-increment on `startFocus` (S3 reads config, does
not mutate the template) · `name`/`description` encryption activation → M3/DB-5 · template picker UI → `fe-sessions`.
