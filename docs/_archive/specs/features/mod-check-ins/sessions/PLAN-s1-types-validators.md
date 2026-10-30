# PLAN — check-ins ① · S1 Types & validators

Status: draft (gate-1 = this spec) · Session: 2026-09-19-mod-check-ins · Slice: S1 (legs CHE-18, CHE-19)
No-Guessing: every claim [FACT: path:line] / [INTERP] / [UNKNOWN]. RATIFY-mode (the shapes are doc-fixed).

## 1. Identity

Author the check-ins **Zod entity object validators** in `@vida/core` — the validation source for every S2–S5 op —
mirroring the colocated Preferences precedent. `[FACT: validators/user.ts:28-105]`
**What it is NOT:** not the enum schemas (already exist, `validators/user.ts:19-22`); not net-new `@vida/types`
(enums+interfaces exist, `entities/user.ts:104-180` — verify only, CHE-18 "no types file" is STALE per BASELINE);
not the service logic (S2+).

## 2. Business Rules (the invariants S1 encodes)

- **CHE-18 — canonical validators.** The 4 enum schemas (`check_in_type`(6)/`field_type`(6)/`schedule_type`(3)/
  `preferred_time`(4)) exist and are parity-tested vs SQL CHECK; S1 adds the entity OBJECT schemas + create/patch
  variants. `[FACT: validators/user.ts:19-22; entities/user.ts:104-126]`
- **CHE-19 — scale/range bounds.** `mood_score`/`energy_level` bounded 1–10 (int); question `min_value`/`max_value`
  are the per-question bounds (int, nullable). `[FACT: conventions.md:44; business-rules.md CK-5; check-ins.ts:52-53,98-99]`
- **Field shapes mirror the interfaces EXACTLY — DOMAIN fields only.** The object schemas validate the domain
  fields, **excluding `baseColumns`/`syncColumns`** (id + timestamps + `_sync_*`), per the `UserPreferencesFields`
  precedent (it validates only config fields, never id/`_sync_*`). `[FACT: validators/user.ts:33-79]` Shapes
  (`DailyCheckIn`/`CheckInTemplate`/`CheckInTemplateQuestion`, `entities/user.ts:128-180`): FIXED enums → reuse
  the tuple schemas; `[E]` arrays → `z.array(z.string())`; reflection → `z.string().nullable()`; `custom_data` →
  `z.record(z.string(), z.unknown()).nullable()`; `template_id` → `z.string().nullable()` (Id | null, `:132`);
  `check_in_date` → `z.string()` (YYYY-MM-DD, `:130`); nullability per the interface. `[FACT: entities/user.ts:128-180]`
- **Patch = `.partial()`** — the `UpdatePreferencesSchema` idiom. `[FACT: validators/user.ts:82,97]`
- **Parity invariant (repo-wide):** tuple ≡ union ≡ z.enum ≡ SQL CHECK, enforced by `enum-parity.test.ts`. S1 must
  not break it. `[FACT: packages/types/src/CLAUDE.md]`

## 3. Contract (what S1 exposes)

In `packages/core/src/validators/user.ts` (appended after the Preferences block, per colocation):

- `DailyCheckInFields` (z.object mirroring `DailyCheckIn`) · `CreateCheckInSchema` (the create input — required
  slot keys `check_in_date`+`check_in_type`, the rest optional/defaulted) · `UpdateCheckInSchema` = `.partial()`.
- `CheckInTemplateFields` · `CreateTemplateSchema` · `UpdateTemplateSchema` = `.partial()`.
- `CheckInTemplateQuestionFields` · `AddQuestionSchema` (create) — `field_key` → `z.string().min(1)` (required,
  non-empty; UNIQUE per template, CHE-08 — the `command_key` min(1) precedent, `validators/user.ts:102`);
  `label` → `z.string()` ([E]); `field_type` reuses `CheckInQuestionFieldTypeSchema`; `is_required` → `z.boolean()`;
  `placeholder` → `z.string().nullable()`; `min_value`/`max_value` → `z.number().int().nullable()`; `sort_order` → `z.number().int()`.
- `ScheduleConfigSchema` (setSchedule input, CHE-11): `schedule_type`/`preferred_time` reuse tuple schemas
  (nullable), `schedule_days` = `z.array(z.number().int().min(0).max(6)).nullable()`. `[FACT: check-ins.ts:76-78]`
  > `[INTERP — exact export names finalized against the Preferences naming (`…Fields`/`Update…Schema`); no doc fixes
the identifier, only the shape. Placement in `validators/user.ts` follows the enums' colocation, not a new file.]`

## 4. Acceptance

- [ ] Enum-parity test still green (no tuple/CHECK drift). `[FACT: enum-parity.test.ts]`
- [ ] Each object schema accepts a valid row (mirrors the interface) — unit test in `validators/check-ins.test.ts`.
- [ ] ≥2 invalid cases per schema rejected: out-of-range mood/energy (CHE-19), bad enum value, missing required slot key, empty `field_key`.
- [ ] `.partial()` patch accepts an empty/partial object.
- [ ] `tsc --noEmit` 0 errors · ESLint 0.
- [ ] Verification Gate: `pnpm --filter @vida/core test` green (new `validators/check-ins.test.ts` + no regression on enum-parity/enums).

## 5. Implementation Prompt

1. In `packages/core/src/validators/user.ts`, after line 105 (RecordCommandSchema), add the check-ins block with
   a header comment citing "check-ins ① · S1 · CHE-18/19 · mirrors @vida/types entities/user.ts + schema/check-ins.ts".
2. Author `DailyCheckInFields`, `CreateCheckInSchema`, `UpdateCheckInSchema` per §3 — mood/energy `z.number().int().min(1).max(10).nullable()` (§2 CHE-19); arrays `z.array(z.string())`; `custom_data` `z.record(z.string(), z.unknown()).nullable()`.
3. Author `CheckInTemplateFields` + create/update; `CheckInTemplateQuestionFields` + `AddQuestionSchema`; `ScheduleConfigSchema`.
4. Add a **colocated** test file `packages/core/src/validators/check-ins.test.ts` — following the
   `enums.test.ts`/`enum-parity.test.ts` colocation (there is NO `validators/__tests__` dir and NO per-domain
   validator test convention; object validators are otherwise proven via their SERVICE consumer, e.g.
   `UserPreferencesFields` → `preferences-service.test.ts`). `[FACT: ls validators/]` S1 has no service consumer
   yet, so this dedicated test is what closes S1's Verification Gate (the "no owed gates" rule — S1 must be
   independently verifiable). Cases: valid row + ≥2 invalid per schema (out-of-range mood/energy, bad enum,
   missing required slot key / empty `field_key`).
5. Run `pnpm --filter @vida/core test` + `tsc --noEmit` → §4 done-check.

## 6. Open UNKNOWNs

- [none blocking] — export identifiers are the only [INTERP], resolved against the Preferences naming at build.

## 7. Change Log

| Date       | Session                  | Change                 |
| ---------- | ------------------------ | ---------------------- |
| 2026-09-19 | 2026-09-19-mod-check-ins | S1 PLAN draft (ratify) |
