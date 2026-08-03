# REPO.md — vida-platform Navigation Index
# Claude: read this BEFORE exploring the tree. Go directly to the files listed here.
# Last updated: 2026-06-07

Zero-knowledge, local-first, multiplatform life management SaaS.
Turborepo + pnpm · TypeScript 5.7 strict · Node 22 · React 19.
Full domain/feature spec lives in `CLAUDE.md`. ADRs in `docs/core/decisions/`.

## Where Things Live

### Shared packages (`packages/`)
| Package | Path | Purpose | Key entry files |
|---------|------|---------|-----------------|
| `@vida/types` | `packages/types/src/` | Shared TS types + Zod schemas per domain | `index.ts`, `models.ts`, `sync.ts`, `encryption.ts`, `editor.ts` + one file per domain (`finance.ts`, `task.ts`, `note.ts`, `learning.ts`, `relationship.ts`, `habit.ts`, `routine.ts`, `project.ts`, `knowledge.ts`) |
| `@vida/core` | `packages/core/src/` | Business logic, encryption, sync, DB, services | `index.ts`; encryption → `encryption/{srp,vault,key-management,sharing}.ts`; DB → `db/{schema,repository,adapter}.ts`; sync → `sync/{crdt,resolver,queue}.ts`; services → `services/` (analytics, study-planner, …); models → `models/`; utils → `utils/{markdown,graph-data,ics-parser}.ts` |
| `@vida/editor` | `packages/editor/src/` | TipTap block editor + extensions + serializers | `editor.tsx`, `slash-menu.tsx`, `toolbar.tsx`; platform blocks → `extensions/`; export → `serializers/{from-markdown,to-markdown,to-pdf,to-docx}.ts` |
| `@vida/ui` | `packages/ui/src/` | Shared Tamagui components | `components/` (neural-graph, calendar-view, gallery-view, list-view, timeline, pomodoro-widget, export-dialog) |

### Apps (`apps/`)
| App | Path | Stack | Key entry files |
|-----|------|-------|-----------------|
| `@vida/web` | `apps/web/` | Vite + React SPA, TanStack Router | `src/main.tsx`, `src/App.tsx`, `src/db/web-adapter.ts`, `vite.config.ts` |
| `@vida/mobile` | `apps/mobile/` | Expo + Expo Router | `app/(tabs)/*.tsx`, `app/journal/[date].tsx`, `app/note/[id].tsx`, `db/` |
| `@vida/desktop` | `apps/desktop/` | Tauri v2 + React (shares web) | `src/`, `src-tauri/` |
| `@vida/server` | `apps/server/` | Hono on Cloudflare Workers | `src/index.ts`, `src/routes/{auth,sync,billing}.ts`, `wrangler.toml` |

### Docs & decisions
- `docs/README.md` — **documentation manifest** (master map: levels × aspects, fill order, status tracker)
- `docs/core/README.md` — core index · `docs/features/README.md` — features index (17 modules, status + links)
- Feature contexts use the **canonical 5 aspects** (`identity · business-rules · contract · structure-data · conventions`). Documented so far: **Notes & Pages** (`docs/features/notes-and-pages/`).
- `docs/core/decisions/ADR-001-tech-stack.md`, `ADR-002-data-model.md`, `ADR-003-sync-protocol.md`
- `docs/core/business-rules.md` — the system constitution (18 invariants every level inherits)
- `docs/specs/foundation/frontend-source-of-truth.md` — **frontend source-of-truth direction** (code-first interim; community Figma file later via Figma MCP scripter, NOT Tokens Studio; release-gated M4 P2-⑦). Every DS/UI/UX spec inherits it (`## 0. Source model`, enforced by `pnpm check:frontend-source-model`).
- `.adr/` — toolkit ADR template (project-local decisions)

### Tooling & config
- `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` — monorepo config
- `tools/generators/`, `tools/scripts/` — code generators & scripts
- `.github/` — CI/CD
- `.claude/` — toolkit state (tasks, sessions, docs, hooks, knowledge)

## Conventions (see CLAUDE.md for full list)
- PKs: UUIDv7 TEXT · timestamps: Unix ms INTEGER · money: INTEGER cents · dates: `YYYY-MM-DD` TEXT
- No inline `notes` columns — all notes via `pages` table (polymorphic `entity_type`/`entity_id`)
- Field-level encryption marked `-- [E]` · sync metadata `_sync_*` on every syncable table
- Enums: SQL CHECK + canonical Zod in `@vida/core`

## Common Commands
`pnpm dev` · `pnpm build` · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm format`

## Layer Documentation
Claude reads these automatically when editing in each directory:
- `packages/types/src/CLAUDE.md` — shared type definitions
- `packages/core/src/db/CLAUDE.md` — Drizzle schema + encrypting repository + adapter
- `packages/core/src/encryption/CLAUDE.md` — zero-knowledge crypto (vault, SRP, key lifecycle)

Only implemented layers are documented; most other dirs are empty scaffolds.
Run `/layer-docs` again as they fill in, or `/layer-docs --refresh` to regenerate.
