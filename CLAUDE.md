# Vida Platform

Zero-knowledge, local-first life management app: modules for tasks, habits, routines, notes and journals, learning, relationships, finance and more. The user's device is the source of truth; the server only relays encrypted blobs. Single user, many devices.

Turborepo + pnpm · TypeScript strict · Node 22 · React 19.

## Where code lives

| Path                          | What                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `packages/types/src`          | `@vida/types`: shared types, enum tuples, Zod schemas                           |
| `packages/core/src`           | `@vida/core`: services, foundation, Drizzle schema and repository, sync, crypto |
| `packages/editor/src`         | `@vida/editor`: TipTap block editor, extensions, serializers                    |
| `packages/ui/src`             | `@vida/ui`: shared Tamagui components and themes                                |
| `apps/web`                    | `@vida/web`: Vite + React SPA, TanStack Router, e2e in `apps/web/e2e`           |
| `apps/server`                 | `@vida/server`: Hono on Cloudflare Workers (not needed for M1 work)             |
| `apps/mobile`, `apps/desktop` | Expo and Tauri shells                                                           |
| `tools/checks`                | The scripts behind `pnpm check:*`                                               |

Layer rules live in the `CLAUDE.md` beside the code and load when you work in that folder. Repo-wide rules are in `.claude/rules/golden-rules.md`; follow them, this file does not repeat them.

## Rules

- **The Linear issue is the plan.** Scope, acceptance and status live in the issue (team LIF). Never write plan, spec, status, session or log files; history is git.
- **Fetch docs, never browse.** See "Getting docs" below. Read only what the issue names; ask before reading anything else.
- **Unknown means ask.** A fact you cannot source becomes a question on the issue, never a guess.
- **One fact, one home.** Data shapes live in the Drizzle schema, business rules in tests named by rule ID, routes in `apps/web/src/routes.tsx`, decisions in ADRs. Link to the home; never restate it in prose.
- **One-way doors need an ADR.** A decision that is hard to reverse goes in `docs/core/decisions/` as `ADR-NNN`, approved before code depends on it.
- **The archive is off limits.** Retired docs and session state are denied by `.claude/settings.json`; never read or link into them, and `pnpm check:docs` fails a link that does.
- **Done means the checks pass.** Show the command and its output.
- **Branches.** `main` plus short-lived branches named after the Linear issue; one issue, one PR; conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).

## Commands

| Command                                      | Does                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev:app`                               | Web app and package watchers, no server. Use this for M1 (local-only) work                                                                 |
| `pnpm dev`                                   | Everything, including the Worker via `wrangler dev` (needs macOS 13.5+)                                                                    |
| `pnpm check`                                 | The full gate: guardrail scan, format, one-way-door, types-derived, boundaries, then lint, typecheck, test and e2e. Pre-push and CI run it |
| `pnpm test` · `pnpm typecheck` · `pnpm lint` | One stage of the gate, through Turborepo                                                                                                   |
| `pnpm format`                                | Prettier on code, JSON and Markdown                                                                                                        |
| `pnpm check:docs`                            | Doc unit rules: frontmatter, token budgets, archive links, current index                                                                   |
| `pnpm docs:index`                            | Rebuild `docs/index.json`; run after any doc unit edit                                                                                     |
| `pnpm check:rules`                           | Rule IDs mapped to tests                                                                                                                   |

## Getting docs

Docs are small units, each with an ID in its frontmatter: `MOD-<module>`, `FLOW-<module>-<flow>`, `ARCH-<topic>`, `ADR-NNN` and generated `REF-*` (schema, services, routes, rules). `docs/index.json` lists every unit; it is generated, never edited.

- Fetch units with the `get_context` tool: pass IDs (`ids: ["MOD-tasks", "ADR-002"]`) or the issue text (`issue`). It loads them and their direct links within a token budget.
- The pack lists what it left out, with sizes. Fetch an omitted unit by ID in another call only if the work needs it.
- An unknown ID comes back as a question. Ask; do not search the tree for a substitute.
- Until a subject has a unit, read only the paths the issue names, and ask before opening anything else.
