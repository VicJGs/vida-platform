# Fix Unit — m4-deploy-ci-active-in-m1

> **Type:** bug (triage diagnosis) · **Status:** diagnosed — resolution PROPOSED, pending Approval (STRUCTURAL)
> **Created:** 2026-10-13 · **Profile:** Generic Coding Session (triage) · **Linear:** LIF-229 (Workers) · LIF-236 (minutes)
> **Classification:** 🔴 STRUCTURAL
> No fix is applied by this document. STRUCTURAL verdict ⇒ a PLAN is approved before any change (§XXVI/§XXIV).

## 0. Source model

N/A — CI/infra + account config; no frontend surface. (frontend-source-of-truth not applicable.)

## 1. Identity — defect, root cause, facets, files

**Defect.** M4 deploy/build infrastructure runs during M1, and the account's GitHub Actions budget is exhausted so no CI job can be provisioned.

**Root cause (one sentence).** CI is dark because the account Actions-minutes budget is exhausted so jobs can't be provisioned — driven by M4 deploy/build infra (`deploy.yml` server+web deploys + Cloudflare's "Workers Builds" Git-integration) running during M1, when per MVP-PATH §1/§6 the server and hosting (Venues) belong to M4 — **not** because any M1 code or workflow step fails.

**Facets.**

- _Symptom vs cause._ Symptom = all GitHub Actions checks red (looked like the single LIF-229 "Workers Builds" red). Cause = (a) account-level job-provisioning block + (b) M4 CI active in M1 driving the burn. [FACT: `gh api .../runs/<id>/jobs` → `jobs[].steps==[]`, `runner:""`, 3–5s; `GET .../logs` → 22-byte empty zip; repo `isPrivate:true`, no subscription]
- _Config drift._ [FACT: `.github/workflows/deploy.yml:3-5` `on: push: branches:[main]`; jobs `CI Checks` (dup of `ci.yml` lint/typecheck/test), `Deploy Web App` (CF Pages, `:55-60`), `Deploy Server` (CF Workers `command: deploy`, `:83-88`)]
- _Plan grounding._ [FACT: `docs/roadmap/MVP-PATH.md` §1 "M4 … sync engine + server + …"; §6 "No server; Sync OFF → M4"]
- _Affected layers._ GitHub Actions (`ci.yml` 5 checks on every PR+push; `deploy.yml` 3 jobs per merge) + Cloudflare Git-integration (dashboard-side "Workers Builds").
- _Repro._ `gh run list --branch main` → every CI + Deploy run fails in ~5s incl. docs-only merges (#133/#134/#135); `pnpm dev` server leg crashes separately (workerd < macOS 13.5 — see PR #136 `dev:app`).

**Files involved.** `.github/workflows/deploy.yml` · `.github/workflows/ci.yml` · `apps/server/wrangler.toml` · `.claude/tasks/ci-workers-build-config.md` (LIF-229) · `.claude/tasks/ci-actions-minutes-exhausted.md` (LIF-236).

## 2. Violated invariant

MVP-PATH §1/§6 + ADR-017 hard-sequencing: **M1 is local-only, no-server, no-cloud-deploy; Venues/server = M4.** No M1 pipeline may build or deploy the server, and (security) no server may be auto-published before the M3 zero-knowledge encryption pass. Both are currently violated.

## 3. Resolution contract (what a fix MUST / MUST NOT do)

- MUST stop M4 deploy/build jobs from auto-running in M1 (no `push:[main]` deploy of server/web).
- MUST preserve the deploy jobs intact for re-enablement at M4 (no deletion of deploy logic).
- MUST NOT auto-publish `@vida/server` while M3 encryption is OFF.
- MUST leave the M1 `ci.yml` checks (lint/typecheck/test/e2e/format) in place (they are the M1 signal).
- Account/dashboard half is Victor's (no repo change can do it).

## 4. Acceptance (verification once the fix is applied)

- `deploy.yml` no longer triggers on `push:[main]` (manual `workflow_dispatch` only) — verified by a docs-only merge producing **no** Deploy run.
- After the Actions budget resets, `ci.yml` jobs execute steps (not `runner:""`/0-step) — verified by `gh run view` showing real step logs.
- The "Workers Builds: vida-platform" check no longer appears on PRs (after Victor disconnects the CF integration).
- No `@vida/server` deploy occurs in M1.

## 5. PROPOSED resolution (NOT applied — pending Approval 1/2, STRUCTURAL)

- **Repo (mine, gated):** set `deploy.yml` trigger to `workflow_dispatch` with a comment homing it to M4; (optional, separate decision) trim `ci.yml` E2E frequency to cut burn.
- **Account/dashboard (Victor):** wait for the monthly Actions reset (no subscription ⇒ cannot raise the limit); disconnect the CF "Workers Builds" Git integration (CF dash → Settings → Build → Branch control) — per `ci-workers-build-config.md`.

## UNKNOWN (labeled, No-Guessing)

- The literal GitHub "job was not started because…" banner is unconfirmed (needs account billing access). The `runner:""` + 0-step + empty-log signature on a private no-sub repo makes minutes-exhaustion the overwhelming reading. [UNKNOWN: needs account billing view]
