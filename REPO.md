# REPO.md — vida-platform Navigation Index
# Claude: read this BEFORE exploring the tree. Go directly to the files listed here.
# Last updated: 2026-06-07

Zero-knowledge, local-first, multiplatform life management SaaS.
Turborepo + pnpm · TypeScript 5.7 strict · Node 22 · React 19.
Full domain/feature spec lives in `CLAUDE.md`. ADRs in `docs/decisions/`.

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
- `docs/decisions/ADR-001-tech-stack.md`, `ADR-002-data-model.md`, `ADR-003-sync-protocol.md`
- `docs/` also holds module specs, editor blocks, encryption, sync-protocol, platform & infrastructure notes
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
