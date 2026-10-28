# apps/web/src/voice — Voice & copy-honesty (fe-codec-patterns S5)

**Owning issue:** fe-codec-patterns (LIF-211) · **Authority:** `frontend-quality-bar §2.1-2.2` (voice + copy honesty) ·
generalizes `onboarding/steps.ts` BR-4 (the staged m1/m3 contract).

## What lives here

- `voice-copy.ts` — `VOICE` (tone: plain·calm·honest·warm·yours, sentence case) + `lintCopy(text) → CopyIssue[]`.

## Rules

- **`lintCopy` is a BACKSTOP, not the contract.** It flags only mechanically-detectable violations — `zk-sync-claim`
  (zero-knowledge / end-to-end / cloud-sync overclaims, which have no honest M1 use) + `dead-end` ("No data available"-class).
  The m1/m3 staged-contract pattern (onboarding `OnboardingCopyContract`) governs staged claims — `lintCopy` does not replace it.
- **Bare `encrypt` is deliberately NOT flagged** — it false-positives on honest staged copy ("Encryption arrives at M3").
- **Tonal rules (blame→teach, etc.) are `VOICE` guidance**, not a false-precision NLP lint.
- **M1 is local-first** — never claim zero-knowledge _sync_ before M3.
