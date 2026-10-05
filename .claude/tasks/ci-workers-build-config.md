# Task: ci-workers-build-config
# Status: planned (needs Victor — Cloudflare dashboard)
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

## Plan (when picked up — Victor)
Options:
1. In the CF dashboard → the vida-platform Workers project → Build settings: set **root dir** to repo root, **build
   command** to `pnpm install && pnpm --filter @vida/server build` (or the deploy equivalent), pnpm version via
   `packageManager` (as the GH Actions now do post-#79).
2. Or disable Workers Builds on PRs (deploy only on merge to main) if pre-merge CF builds aren't wanted.
3. If CF should build from repo config, add a `[build]` section to `wrangler.toml` per current CF docs (verify the
   CF Workers Builds doc first — behavior differs between `wrangler deploy` and the Git integration).
