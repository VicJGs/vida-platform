# PLAN — check-ins ① · S3 Templates & questions

Status: draft (gate-1 = this spec) · Session: 2026-09-19-mod-check-ins · Slice: S3 (legs CHE-05,06,07,08,09,10,11,12,22)
No-Guessing: every claim [FACT: path:line] / [INTERP] / [UNKNOWN]. Grounded in the notes/S2 precedent + check-ins docs (intake §Resolution G3/G5).

## 1. Identity

Extend the check-ins service with the **template form-engine**: template CRUD, typed questions, default-first
resolution, schedule config, seeding, and the no-FK app-cascade on template delete.
**What it is NOT:** not per-type template rows keyed by a `check_in_type` column — **there is none** (ADR-002
§5.13 DDL:3267); the model is resolved by `is_default`/`is_active` (below). Not derivations (S4) or cross-module
seams (S5).

## 2. Business Rules (the model — from the CONFIRMED intake §Resolution)

- **G5 / CK-4 — the built-in columns ARE the default template.** `[FACT: intake:55; business-rules CK-4]` The
  `daily_check_ins` standard columns are the default; a `check_in_templates` row exists ONLY when the user
  personalizes. Creating a row to represent the built-in would DUPLICATE it (violates single-source) — so the
  built-in needs no row.
- **G3 — a default per type, zero-setup, edit-to-personalize.** `[FACT: intake:47-50]` The user "starts minimal
  WITHOUT creating anything" (the built-in serves every type) and "creates/edits only to personalize."
- **CHE-05 `getActiveTemplate(type)` — default-first.** Return the user's ACTIVE default custom template
  (`is_active=true AND is_default=true`) if one exists, else `null` → the caller renders the built-in columns.
  **Resolution is via `is_default`/`is_active` (columns that exist), NOT a `check_in_type` column** — the built-in
  default is type-agnostic (G5), so no per-type filter is needed. The `type` param is part of the seam-contract
  shape; M1.0 resolves default-first. `[FACT: intake:47-55; parts CHE-05]`
- **CHE-12 `seedDefaultTemplates()` — seeds ONE canonical default, idempotent.** Reconciles all three docs:
  CHE-12 (seed a default) + G3 (the user "edits defaults to personalize" ⇒ an editable default ROW must exist) +
  G5 (the columns are where _answers_ materialize — the seeded row DEFINES the default's questions, it does NOT
  duplicate answers). So `seedDefaultTemplates()` seeds **one canonical, type-agnostic default template**
  (`is_default=true, is_active=true`) IF none exists (idempotent — skip when a default already exists; never a
  duplicate on re-run). The built-in columns remain the zero-setup answer path (G5); the seeded row is the
  editable starting point (G3). `getActiveTemplate` returns it via `is_default` (type-agnostic — no per-type rows
  the schema can't distinguish). `[FACT: parts CHE-12; delivery-plan §9:255; intake:47-55]`
- **CHE-06/07 template CRUD.** `createTemplate`/`updateTemplate` over `check_in_templates` (full table, has
  baseColumns). Backfill notNull-default columns on create (icon `'clipboard-check'`, is_default false, is_active
  true, sort_order 0) so the returned row is faithful (S2 precedent). `schedule_days` is JSON `text()` →
  (de)serialize like S2's arrays; return the parsed `CheckInTemplate`. `[FACT: check-ins.ts:67-81; entities/user.ts:153-165]`
- **CHE-08/09/10 questions.** `addQuestion` enforces UNIQUE(`template_id`,`field_key`) via a pre-query →
  `DuplicateFieldKeyError` (the S2 slot pre-query pattern; DB `uq_check_in_template_questions_field` is backstop).
  `reorderQuestions` persists `sort_order`; `removeQuestion` hard-deletes. **Reduced-column seam:**
  `check_in_template_questions` = `id + syncColumns`, NO created_at/updated_at → `Repository.create` adds phantom
  baseColumns that Drizzle drops on INSERT but the create() RETURN carries → build the returned view explicitly
  (strip the phantom cols). `[FACT: check-ins.ts:86-104; memory repository-create-on-reduced-column-table-drops-phantom-basecolumns]`
- **CHE-11 `setSchedule(templateId, cfg)`.** Persist `schedule_type`/`schedule_days`/`preferred_time` (config
  only — the fire is CHE-24/S-deferred). `ScheduleConfigSchema` (S1). `[FACT: parts CHE-11; check-ins.ts:76-78]`
- **CHE-22 no-FK app-cascade on delete.** `deleteTemplate(id)`: the schema is no-FK, so the service enforces the
  intended integrity in app code — **null out** referencing `daily_check_ins.template_id` (the entry survives)
  and **delete** the template's `check_in_template_questions` (the CASCADE). `[FACT: check-ins.ts:39,90; parts CHE-22 reconciled to no-FK]`
- **Persistence:** both repos `softDelete: false` (no `deleted_at` on either table; CK-10 hard-delete),
  `encryptedFields: []` (M1.0). `[FACT: check-ins.ts:80,85]`

## 3. Contract (types.ts append)

```ts
interface CheckInsService {                       // + S3 methods
  getActiveTemplate(type: CheckInType): Promise<CheckInTemplate | null>          // CHE-05
  createTemplate(input: CreateTemplateInput): Promise<CheckInTemplate>           // CHE-06
  updateTemplate(id: string, patch: UpdateTemplateInput): Promise<CheckInTemplate> // CHE-07
  deleteTemplate(id: string): Promise<void>                                      // CHE-22 (app-cascade)
  seedDefaultTemplates(): Promise<CheckInTemplate[]>                             // CHE-12 (idempotent)
  addQuestion(templateId: string, q: AddQuestionInput): Promise<CheckInTemplateQuestionRow>   // CHE-08
  reorderQuestions(templateId: string, orderedFieldKeys: string[]): Promise<void>             // CHE-09
  removeQuestion(templateId: string, fieldKey: string): Promise<void>                         // CHE-10
  getQuestions(templateId: string): Promise<CheckInTemplateQuestionRow[]>                     // read
  setSchedule(templateId: string, cfg: ScheduleConfigInput): Promise<CheckInTemplate>         // CHE-11
}
class DuplicateFieldKeyError extends Error   // CHE-08
```

Templates return the parsed `CheckInTemplate` (schedule_days JSON → number[]); questions return
`CheckInTemplateQuestionRow` (no JSON fields → raw Row is the seam, the "raw reader returns Row" convention),
with the phantom baseColumns stripped.

## 4. Acceptance

- [ ] createTemplate persists + backfills defaults; updateTemplate patches; schedule_days round-trips (number[]).
- [ ] getActiveTemplate returns the active is_default template, else null (built-in).
- [ ] seedDefaultTemplates seeds one canonical default (is_default=true) on an empty store; is idempotent (re-run creates no duplicate); getActiveTemplate then returns it.
- [ ] addQuestion enforces UNIQUE(template_id, field_key) → DuplicateFieldKeyError; reorder/remove work; question row has no phantom created_at/updated_at.
- [ ] setSchedule persists config.
- [ ] deleteTemplate nulls referencing entries' template_id AND deletes the template's questions (app-cascade), entries survive.
- [ ] tsc 0 · ESLint clean.
- [ ] **Verification Gate:** Vitest + ≥2 failure paths (dup field_key, cascade) + **live-store smoke** (real seed + template delete cascade + getActiveTemplate fallback).

## 5. Implementation Prompt

1. `validators/user.ts` already has `CreateTemplateSchema`/`UpdateTemplateSchema`/`AddQuestionSchema`/`ScheduleConfigSchema` (S1) — reuse.
2. `types.ts` — append the S3 methods + input types (z.infer) + `DuplicateFieldKeyError`.
3. `service.ts` — add `templateRepo` (check_in_templates, softDelete:false) + reuse the read-only `questionRepo`; implement §2/§3. Template returns via a `toTemplate(row)` mapper (parse schedule_days) + `serializeTemplate` (stringify). Question create strips phantom base cols. deleteTemplate does the app-cascade in code.
4. `__tests__/checkins-service.test.ts` — extend with S3 cases + live-store smoke (§4).
5. `pnpm --filter @vida/core test` + `tsc --noEmit` → §4 done-check. Currency Rule: refresh current-spec.

## 6. Open UNKNOWNs

- [none blocking] — the template↔type model is doc-resolved (G3/G5): built-in default is type-agnostic; resolution via is_default/is_active; no check_in_type column. seedDefaultTemplates idempotent-thin (G5 subsumes per-type rows). To be stress-tested at gate-1.

## 7. Change Log

| Date       | Session                  | Change                                                                                  |
| ---------- | ------------------------ | --------------------------------------------------------------------------------------- |
| 2026-09-19 | 2026-09-19-mod-check-ins | S3 PLAN draft (template model grounded in intake §Resolution G3/G5 after a drift-catch) |
