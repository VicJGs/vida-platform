// Frecency ranking — pinned first, then recency-weighted frequency; commands with no history row keep their
// input order after ranked ones. PURE: no table, no I/O; `now` is INJECTED for determinism (no Date.now() here).
// Join key = CommandHistoryEntry.command_key ↔ Command.id. The history shape is the v1 six-field contract.
import type { Command, CommandHistoryEntry } from './types'

export function rankByFrecency(commands: Command[], history: CommandHistoryEntry[], now = 0): Command[] {
  const byKey = new Map(history.map((h) => [h.command_key, h]))
  return commands
    .map((cmd, index) => ({ cmd, index, entry: byKey.get(cmd.id) }))
    .sort((a, b) => {
      const pinned = pinnedRank(b.entry) - pinnedRank(a.entry)
      if (pinned !== 0) return pinned
      const score = frecencyScore(b.entry, now) - frecencyScore(a.entry, now)
      if (score !== 0) return score
      return a.index - b.index // stable — preserves input order on ties
    })
    .map((x) => x.cmd)
}

function pinnedRank(entry: CommandHistoryEntry | undefined): number {
  return entry?.is_pinned === 1 ? 1 : 0
}

function frecencyScore(entry: CommandHistoryEntry | undefined, now: number): number {
  if (!entry) return 0
  const recency = entry.last_used_at === null ? 0 : recencyWeight(now - entry.last_used_at)
  return entry.use_count * recency
}

// Bounded (0,1]; newer → closer to 1, decaying with age in days.
function recencyWeight(ageMs: number): number {
  const DAY_MS = 86_400_000
  const ageDays = Math.max(0, ageMs) / DAY_MS
  return 1 / (1 + ageDays)
}
