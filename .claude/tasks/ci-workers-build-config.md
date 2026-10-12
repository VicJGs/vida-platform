# Task: ci-workers-build-config
# Status: resolved-pending-action (2026-10-12 — fix chosen + steps documented; awaits Victor's 1-click CF dashboard change)
# Linear: LIF-229
# Profile: Generic Coding Session
# Created: 2026-10-05

## Goal
Fix the failing "Workers Builds: vida-platform" check (Cloudflare Git-integration build).

## Context / triage (2026-10-05, ci-housekeeping)
- The "Workers Builds" check is **Cloudflare's own Git-integration build** (links to dash.cloudflare.com), NOT a
  GitHub Action. It fails in ~0s (fails before/at build start).
- `apps/server/wrangler.toml` is minimal (`name`, `main=src/index.ts`, compat date, observability) — **no `[build]`
  section**, and there is no repo-side CF build-config file. The build command / root directory / deploy settings live
  in the **Cloudflare dashboard**, which is not reachable from the repo.
- Likely cause: CF runs `pnpm install`/build from the wrong root or with a pnpm/env mismatch in a pnpm monorepo
  (the server is `apps/server` inside a Turborepo+pnpm workspace).

## Why not fixed in ci-housekeeping
Not repo-fixable without CF dashboard access. **Needs Victor** in the Cloudflare dashboard.

## Resolution (2026-10-12) — chosen: disable Preview Builds (Option 2), plan-grounded

**Decision ground (docs, not preference):** `docs/roadmap/MVP-PATH.md` §1 + §6 — the server (`@vida/server`) is
an **M4** artifact (Venues / Multi-Device: "sync engine + server"). The whole current phase (M1) is explicitly
*"local-only, no-sync, **no server**"* and "needs none of M2–M4." So a Cloudflare Workers build gating **M1** PRs
validates an artifact that has **no M1 role** → it is premature noise, not a signal. Same root cause as the local
`pnpm dev` server crash (both: the server doesn't belong in the M1 loop). Deferring CF builds until M4 is the
plan-aligned move; configuring the build (Options 1/3 below) only earns its keep once the server actually matters.

### ACTION FOR VICTOR (CF dashboard — ~1 min, verified vs current CF docs 2026-10-12)
1. dash.cloudflare.com → **Compute (Workers) → Workers & Pages → `vida-platform`** (the Workers project).
2. **Settings → Build → Branch control.**
3. Set the **production branch** to `main`.
4. **Uncheck "Enable Preview Builds."**
   → Stops every non-production / PR build (the ~0s red check) and the per-PR CF build comments. The production
   branch (`main`) still builds on merge. PR validation stays with GitHub Actions (Typecheck/Lint/Test/E2E).
5. (Optional, later) re-enable at **M4** when the server is in scope, and at that point configure root dir +
   build command (Option 1) or a `wrangler.toml [build]` section (Option 3) per current CF Workers Builds docs.

Docs: https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/ (Settings → Build → Branch control →
"Enable Preview Builds").

### Deferred alternatives (only relevant at M4)
1. CF dashboard → Build settings: **root dir** = repo root, **build command** =
   `pnpm install && pnpm --filter @vida/server build` (or deploy equivalent), pnpm via `packageManager`.
3. Add a `[build]` section to `apps/server/wrangler.toml` per current CF docs (behavior differs between
   `wrangler deploy` and the Git integration — verify at the time).
