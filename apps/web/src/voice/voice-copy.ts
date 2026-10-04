// fe-codec-patterns · S5 — VoiceCopy (Vida's voice + the copy-honesty lint).
// Reconcile: docs/specs/foundation/fe-codec-patterns/s5-conventions.md · interpretation R8 · frontend-quality-bar §2.1-2.2 ·
// onboarding/steps.ts BR-4 (the staged m1/m3 honesty precedent this generalizes).
//
// `VOICE` = the documented voice (the tonal rules — not a false-precision NLP lint). `lintCopy` = a BACKSTOP that flags
// the MECHANICALLY-detectable honesty violations only; it does NOT replace the m1/m3 staged-contract pattern (onboarding
// OnboardingCopyContract) — it catches the obvious overclaims a human might miss.

/** Vida's voice (P6/F1). The tonal rules are guidance for authors + reviewers, not lint-enforced. */
export const VOICE = {
  tone: ['plain', 'calm', 'honest', 'warm', 'yours'] as const,
  case: 'sentence' as const,
} as const

export interface CopyIssue {
  rule: 'zk-sync-claim' | 'dead-end'
  /** The offending substring. */
  match: string
  message: string
}

// High-confidence overclaims with NO honest M1 use. `encrypt` is deliberately NOT here — it false-positives on honest
// STAGED copy ("Encryption arrives at M3"); the m1/m3 contract, not this backstop, governs staged claims.
const ZK_SYNC_CLAIM = /zero.?knowledge|end.to.end|synced? to (the )?cloud|cloud sync/gi
// The P5 dead-end anti-pattern — reach for a teaching EmptyState instead.
const DEAD_END = /no data available|nothing to show|no results found/gi

/**
 * Flag the mechanically-detectable copy-honesty violations in a user-facing string (P6/F2 + BR-4). A backstop:
 * - `zk-sync-claim` — M1 is local-first; no zero-knowledge / cloud-sync claim before M3 (use staged-honest copy).
 * - `dead-end` — a blank dead-end; use a teaching `EmptyState` that says what it is + offers a way in.
 * Returns every match (case-insensitive). The tonal rules (blame→teach, etc.) are `VOICE` guidance, not linted here.
 */
export function lintCopy(text: string): CopyIssue[] {
  const issues: CopyIssue[] = []
  for (const m of text.matchAll(ZK_SYNC_CLAIM)) {
    issues.push({
      rule: 'zk-sync-claim',
      match: m[0],
      message:
        'Overclaim — M1.0 is local-first (encryption/ZK sync arrive at M3). Use staged-honest copy ("saved on this device").',
    })
  }
  for (const m of text.matchAll(DEAD_END)) {
    issues.push({
      rule: 'dead-end',
      match: m[0],
      message: 'Dead-end copy — use a teaching EmptyState that says what it is and offers a way in.',
    })
  }
  return issues
}
