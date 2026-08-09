# Task: tsconfig-strict-index-access
# Status: planned
# Linear: (unfiled — create at pickup)
# Profile: Add Backend Component
# Source: UI-1 UF engineering gate (2026-08-09)

## Goal
Bring `tsconfig.base.json` into conformance with STANDARDS §XV (strict block): add
`"noUncheckedIndexedAccess": true` and `"noImplicitReturns": true`, then resolve the
resulting type errors across the monorepo.

## Why (provenance)
The UI-1 UF engineering gate flagged that `strict: true` alone leaves `noUncheckedIndexedAccess`
OFF — array-index access is silently typed as non-`undefined` across every package. This is a
**repo-wide** standards gap, deliberately NOT folded into the UI-1 PR (it re-typechecks
core/web/server/types and will surface errors well beyond @vida/ui). It gets its own gate.

## Scope
- IN: `tsconfig.base.json` compilerOptions; fixing the cascade of index-access + implicit-return
  errors it surfaces in every workspace package.
- OUT: any behavioral change — this is a type-safety tightening only.

## Notes
- Expect a non-trivial cascade in `@vida/core` (repository/adapter index access) and `@vida/web`.
- The four in-scope UI-1 `!` sites already carry §XV justification comments (done at UF); once
  `noUncheckedIndexedAccess` is on, several can be narrowed to `if`-guards and the `!` dropped.
- STRUCTURAL by §XXIV (repo-wide, cascade-risk) → run the full §XXVI gate before flipping.
