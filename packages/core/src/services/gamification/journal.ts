// ============================================================================
// services/gamification — the Journal contribution + effect wiring (mod-gamification #48 ① · S4)
//
// GM-15: gamification registers ONE JournalContribution into the Journals-owned registry —
// `summary(date)` feeds the daily recap (current level/title · XP balance · achievements to
// date). A no-data day returns a well-formed `state:'empty'` SectionData, never a throw (the
// per-section degrade is the dashboard's). Reuses the TerminalState canon BY TYPE (state from
// its own live read, not deriveTerminalState — the finance precedent). Also the module-init
// effect wiring: register the economy grant/lock handlers so rules + rewards can fire.
//
// NB (M1 scope): the recap is a tz-safe SNAPSHOT. Per-day deltas (XP earned today, achievements
// unlocked today) need a dated ledger/earned-at query + tz handling — a documented refinement.
// ============================================================================

import type { DrizzleDb } from '../../db/adapter'
import type { EffectRegistry } from '../../foundation/effects'
import { createEconomyHandlers, registerEconomyEffects } from '../../foundation/economy'
import type { TerminalState } from '../../foundation/capability/types'
import type { JournalContribution, SectionData, DataPoint, JournalRegistry } from '../journals'
import type { GamificationService } from './types'

// The recap data points gamification advertises (JR-4 — the user's per-module selection).
const DATA_POINTS: readonly DataPoint[] = [
  { id: 'level', label: 'Level' },
  { id: 'xp', label: 'XP' },
  { id: 'achievements', label: 'Achievements' },
]

/** GM-15 — the gamification Journal contribution (summary recap only; it registers no `dueIn` agenda). */
export function createGamificationJournalContribution(svc: GamificationService): JournalContribution {
  return {
    module: 'gamification',
    sectionKey: 'summary',
    dataPoints: DATA_POINTS,

    async summary(date: string): Promise<SectionData> {
      // Snapshot recap (tz-safe): current level + XP balance + achievements to date. `date` is accepted
      // for the contract; per-day deltas are a documented refinement (dated ledger + tz).
      void date
      // XP-only recap: SHIPPED_CURRENCIES=[XP] + the level curve is XP-based (GM-14); custom currencies are a
      // user-extensibility seam, not surfaced in the M1 daily recap (the items payload carries XP only).
      const level = await svc.getLevel() // XP-based level/title (derived live)
      const xp = await svc.getBalance('XP')
      const achievements = await svc.getUserAchievements()
      const hasData = xp.earned > 0 || xp.locked > 0 || achievements.length > 0
      const state: TerminalState = hasData ? 'success' : 'empty'
      return {
        sectionKey: 'summary',
        module: 'gamification',
        dataPoints: DATA_POINTS,
        state,
        items: [
          {
            level: level.level,
            title: level.title,
            xp: { earned: xp.earned, current: xp.current, locked: xp.locked },
            achievementsEarned: achievements.length,
          },
        ],
      }
    },
  }
}

/** Register the gamification contribution into the Journals registry (the register-helper pattern). */
export function registerGamificationJournal(registry: JournalRegistry, svc: GamificationService): void {
  registry.register(createGamificationJournalContribution(svc))
}

/** Module-init wiring: register the economy grant/lock effect handlers on the rail so gamification's
 *  rules (S2) + achievement rewards (S3) can fire. Composes the substrate — invents no handler. */
export function registerGamificationEffects(registry: EffectRegistry, db: DrizzleDb, deviceId: string): void {
  registerEconomyEffects(registry, createEconomyHandlers(db, deviceId))
}
