<!-- Last updated: 2026-06-08 by /session-end -->
| Date | Area | Decision | Choice | Reason | Reversible |
|------|------|----------|--------|--------|------------|
| 2026-06-07 | setup | toolkit initialized on existing repo | Generic Coding Session | wire up toolkit without regenerating existing CLAUDE.md | yes |
| 2026-06-07 | setup | rename Claude.md → CLAUDE.md | git mv | cross-platform memory loading (case-sensitive CI) | yes |
| 2026-06-08 | build | declare cross-package imports as deps | `@vida/types: workspace:*` in core | tsc --noEmit resolves bare specifiers via node_modules, not tsconfig references | yes |
| 2026-06-08 | core | unlockVault return value | return `keyChain.vault_key` not `_vaultKey` | avoid null-widening of module-level mutable across call boundary | yes |
