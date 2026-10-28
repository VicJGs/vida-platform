# Core Conventions — How You Build Within Vida

The global build conventions every package, app, and feature follows. These are the CORE-level
**Conventions** aspect (Levels × Aspects). Lower levels inherit these and may add local conventions,
never contradict them. Each is a FACT cited to its source — nothing invented (No-Guessing Principle).

> Cross-reference: the structural data invariants (DATA-1…DATA-5) live in the constitution
> (`business-rules.md`) because they are _enforced rules_, not stylistic conventions. This file
> covers the build-time conventions that surround them. `[[business-rules]]`

---

## Storage encodings `[FACT: CLAUDE.md Conventions; ADR-002 §2]`

| Concept                        | Encoding                                                               |
| ------------------------------ | ---------------------------------------------------------------------- |
| Primary keys                   | UUIDv7 (time-sortable) as **TEXT**, generated **client-side**          |
| Timestamps                     | Unix **milliseconds** as INTEGER (`Date.now()`)                        |
| Booleans                       | INTEGER `0` / `1`                                                      |
| Monetary values                | INTEGER in **cents**                                                   |
| Calendar dates (no time)       | TEXT `YYYY-MM-DD`                                                      |
| JSON / arrays / nested objects | TEXT (stringified JSON)                                                |
| Enums                          | TEXT + SQL `CHECK` constraint; canonical Zod validator in `@vida/core` |
| Soft delete                    | `deleted_at INTEGER` (NULL = live)                                     |

## Notes are never inline `[FACT: CLAUDE.md Conventions; ADR-002 §2.7, §5.2]`

No table carries a `notes` column. All notes are rows in the `pages` table via the polymorphic
`entity_type` / `entity_id` pattern. See **DATA-3** and **INT-1** in the constitution.

## Sync metadata `[FACT: CLAUDE.md Conventions; ADR-002 §3]`

Every **syncable** table carries: `_sync_id`, `_sync_version`, `_sync_device_id`, `_sync_lww_ts`,
`_sync_status`, `_sync_hash`. Local-only tables (`app_state`, `sync_queue`) do not. See **DATA-4**.

## Field-level encryption marking `[FACT: ADR-002 §4.3; CLAUDE.md Conventions]`

A field is encrypted **iff** marked `-- [E]` in the SQL schema and `@encrypted` in `@vida/types`.
Defined once, honored everywhere. See **EN-2**.

## Package / workspace `[FACT: CLAUDE.md; survey workspaces]`

- Scope: `@vida/*` — packages `core` · `editor` · `ui` · `types`; apps `web` · `mobile` · `desktop` · `server`.
- Language: TypeScript **strict mode**, TS 5.7+. Node 22 LTS. React 19.
- Monorepo: Turborepo + pnpm workspaces.

## Source-of-truth direction `[FACT: ADR-002; @vida/types]`

Types and Zod schemas flow from `@vida/types` → consumed everywhere. Enums are declared once in
`@vida/core` (canonical Zod validators), mirrored as SQL `CHECK` constraints — never re-declared per consumer.
(Constitution rule 3: one canonical source per cross-cutting concern.)

## Git & commits `[FACT: CLAUDE.md Conventions]`

- Conventional commits: `feat:` · `fix:` · `refactor:` · `docs:` · `chore:`.
- Branches: `main` (production) · `develop` (integration) · short-lived feature branches.

## Commands `[FACT: CLAUDE.md Commands]`

`pnpm dev` · `pnpm build` · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm format`

---

## Completion checklist

- [x] Encodings, sync metadata, encryption marking, package scope captured from CLAUDE.md + ADR-002
- [x] Cross-linked to the constitution's DATA / EN / INT rules (no duplication of enforced rules)
- [ ] Revisit when the first feature is implemented in code (conventions currently trace to ADR-002 + types, not running code — most modules are not yet built)
