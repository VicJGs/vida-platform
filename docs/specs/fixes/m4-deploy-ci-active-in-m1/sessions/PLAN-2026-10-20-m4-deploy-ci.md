# PLAN — m4-deploy-ci-active-in-m1 (CI-minutes resolution)

> **Session:** 2026-10-20-ci-minutes-drift · **Language:** English · **Unit:** `docs/specs/fixes/m4-deploy-ci-active-in-m1/`
> **Gate:** §XXVI gate 1 (the SPEC) · **Status:** awaiting /critique → /preflight → Approval 1
> **Verdict carried from triage:** STRUCTURAL. Scope deliberately CONSERVATIVE — "don't change crucial things" (Victor, 2026-10-20).

## 1. Context & demand

The private, no-subscription repo has a 2,000 Actions-min/month cap and it was exhausted, taking all CI dark (jobs fail pre-step, `runner:""`). Root cause is over-provisioned CI for an M1 local-only phase. Measured burn (historical real runs, all `ubuntu-latest` = 1×):

- `ci.yml` per run = ~9.1 billed min (Test 4.61 · Typecheck 1.43 · E2E 1.28 · Lint 0.93 · Format 0.86).
- `deploy.yml` per merge = ~5.7 billed min (CI Checks **5.65** — a _duplicate_ of ci.yml's lint/typecheck/test — + Deploy Web/Server **0.03–0.05 min each = instant fails, deploying nothing**).
- ~14.8 billed min/merge. **CHECK: 28/40 recent commits are docs-only (70%)** → ~70% of CI triggers fire on zero-code commits.

Two dominant, safe waste sources: (a) `deploy.yml` (M4 drift + duplicate CI + failing deploys), (b) full CI on docs-only commits.

## 2. What changes & why (exactly two changes)

- **C1 — Gate `deploy.yml`.** Change its trigger `on: push: branches:[main]` → `on: workflow_dispatch:` + a comment homing it to M4. Removes ~5.7 min/merge of duplicate CI + failing M4 deploys. [FACT: deploy jobs die in 0.03–0.05 min; MVP-PATH §1/§6 server+Venues = M4]
- **C2 — `paths-ignore` docs on `ci.yml`.** Add to BOTH the `push` and `pull_request` triggers:
  ```yaml
  paths-ignore:
    - '**/*.md'
    - 'docs/**'
    - '.claude/**'
  ```
  A push/PR whose files ALL match → workflow skipped; ANY code file → full CI runs. Eliminates ~70% of runs (docs-only). [FACT: 28/40 docs-only; GitHub paths-ignore = skip only when every changed path matches]

## 3. CRUCIAL — DO NOT CHANGE (the preserve inventory)

This is the heart of the "don't change crucial things" mandate. The plan MUST NOT alter any of:

1. **E2E / Playwright job** — the Visual Gate substrate. Commands, trigger, and existence untouched. [[playwright-is-the-visual-gate-substrate-not-ci-cost]]
2. **lint · typecheck · test · format-check jobs** — unchanged; full code signal preserved.
3. **The guarantee that ANY code change still runs full CI.** C2 only skips commits where EVERY changed file is docs (`**/*.md`/`docs/**`/`.claude/**`). A mixed docs+code commit RUNS. A `.ts`/`.tsx`/`.json`/config change RUNS.
4. **`deploy.yml` jobs** — preserved verbatim (only the trigger is gated), so M4 re-enables by restoring `on: push: [main]`.
5. **Secrets, wrangler config, CF integration** — not touched by the repo (CF dashboard disconnect is Victor's separate action).
6. **`develop` trigger line** — left as-is (dead branch, harmless; removing it is out of scope).
7. **Turbo cache / job topology / install steps** — untouched (deferred, see §6).

## 4. Functional rules

- R1: After C1, a `push:[main]` produces NO Deploy run (only manual `workflow_dispatch`).
- R2: After C2, a docs-only push/PR produces NO ci.yml run; a push/PR touching any non-doc file produces the full 5-job run.
- R3: No `@vida/server` is deployed in M1 (restores the MVP-PATH §1/§6 + pre-M3-ZK invariant).
- R4: Nothing in §3 changes.

## 5. Acceptance (how we verify, once applied + Actions budget restored)

- A docs-only commit to main → no CI run, no Deploy run. (Verify via `gh run list` — no new runs for that SHA.)
- A code commit (e.g. touching a `.ts`) → full 5-job ci.yml run executes. (Verify: real step logs.)
- `deploy.yml` never triggers on push. (Verify: no Deploy run on a merge.)
- `grep -c` the e2e/lint/typecheck/test/format jobs in ci.yml = unchanged count; `git diff` touches only the two trigger blocks (ci.yml) and the deploy.yml trigger.
- Estimated new burn: docs-only merges ~0 min; code merges ~9.1 min (ci only). ≈ **70–80% reduction** without touching crucial signal.

## 6. Deferred (NOT in this plan — separate units, higher risk to "crucial" signal)

- #3 consolidate lint+typecheck+test into one job (changes pass/fail granularity).
- #4 Turbo remote cache (`actions/cache` on `.turbo` or Vercel token) — stops rebuilding `^build` per job.
- Removing the dead `develop` trigger.
  Each is its own future PLAN if the budget is still tight after C1+C2 + the monthly reset.

## 8. Exact edits (implementation-ready — pinned at preflight)

**C1 — `.github/workflows/deploy.yml`**, replace the trigger only (jobs untouched):

```yaml
# BEFORE
on:
  push:
    branches: [main]
# AFTER
# Gated for M1 (2026-10-20). Cloud deploy (Venues) + the server are M4 per
# docs/roadmap/MVP-PATH.md §1/§6. Manual-only until M4; re-enable `push: [main]` then.
on:
  workflow_dispatch:
```

**C2 — `.github/workflows/ci.yml`**, replace the `on:` block only (jobs untouched):

```yaml
# BEFORE
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
# AFTER
on:
  push:
    branches: [main, develop]
    paths-ignore: ['**/*.md', 'docs/**', '.claude/**']
  pull_request:
    branches: [main, develop]
    paths-ignore: ['**/*.md', 'docs/**', '.claude/**']
```

(`develop` kept verbatim — dead but harmless, out of scope.)

**Rollback:** `git revert <commit>` (or restore the two `on:` blocks). No state, no migration — fully reversible.
**Precondition for ACCEPTANCE (not for implementation):** the monthly Actions budget must be restored before a run can be observed; the YAML edits can land immediately.
**Implementation path:** dedicated branch → PR → merge (per repo git workflow). Only `.github/workflows/{ci,deploy}.yml` change.

## 7. Account half (Victor — no repo change can do these)

- Wait for the monthly Actions reset (no subscription ⇒ cannot raise the cap).
- Disconnect the CF "Workers Builds" Git integration (CF dash → Settings → Build → Branch control) — per `ci-workers-build-config.md` (LIF-229).

## Resolved checks (critique 2026-10-20)

- **`docs/**`scoping is SAFE.** [FACT:`find docs -type f`= only`.md`+ 13`.html`previews +`.DS_Store`/`.txt`/`.gitkeep`; ZERO `.ts/.tsx/.js/.mjs/.cjs/package.json`; `docs/`is NOT in`pnpm-workspace.yaml`, so `turbo lint/typecheck/test`never cover it.] The only CI job touching docs is`format:check`(prettier on`.md`).
- **Accepted minor tradeoff:** a docs-only commit also skips `format:check` on its `.md`. Moot today (format-check is the deferred LIF-228 red). When LIF-228 lands, revisit whether `.md` formatting warrants a lightweight docs-only format gate. Not blocking — out of scope for a minutes-reduction fix.
- **No UNKNOWNs remain.** C1 breaks no M1 workflow (no required checks; nothing depends on auto-deploy). C2 cannot skip a code change (any non-doc path → full run).
