# services/gamification — per-module business logic

# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this module is

The Points Economy substrate's user-facing SURFACE (currencies, levels, achievements). Engine = foundation/economy/

## Owning ADR / context

ADR-012

## Pattern

Follows the service data-flow pattern GOVERNED by docs/core/architecture/data-flow.md
(validate -> repository -> encrypt-seam -> return). Rides foundation/ substrates; does not re-implement them.

## Status

**① backend COMPLETE** (mod-gamification #48 · LIF-124 · PR #67). `createGamificationService(deps)` — a
factory-object (hoisted closures, no `this.`) over 4 slices:

- **S1** `level.ts` — currency surface (thin-build over `createCurrencyRegistry`) · `deriveLevel` curve · below-floor clamp · `user_profile` view
- **S2** `rules.ts` — rule engine: CRUD · `assertAcyclic` · `executeRule`/`evaluateRules` (parse consequences → idempotent `rail.applyEffect`) · user-authored envelope (fail-closed)
- **S3** `achievements.ts` — static-seed (direct drizzle) · `evaluateAchievements` predicate → unlock (earned-join + registry-guarded reward/notification)
- **S4** `journal.ts` — `createGamificationJournalContribution` (`summary→SectionData`) · `registerGamificationJournal` · `registerGamificationEffects`

Composes (RATIFY, never re-implements): `foundation/economy` (computeBalance/handlers/dispatchConsequence/registry)
· effect rail · measurement seam · capability enforcer · Finance `move_money`. Ground truth:
`docs/modules/gamification/current-{spec,business-rules}.md` (BR-GM-1..22). ② `fe-gamification` (LIF-181) separate.
