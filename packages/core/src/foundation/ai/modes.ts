// ============================================================================
// foundation/ai — modes · honest-egress disclosure · provenance (S1)
//
// XCU-18 (two-mode execution) · XCU-20 (honest content-egress disclosure) ·
// XCU-24 (source=ai provenance). Pure + deterministic — no enforcer, no egress,
// no ports, no I/O. Twin of ingestion/classification.ts.
// ============================================================================

import {
  AI_MODES,
  AI_PROVENANCE,
  UnknownAiMode,
  type AiMode,
  type AiModeDisclosure,
  type AiProvenance,
} from './types'

function isMode(v: string): v is AiMode {
  return (AI_MODES as readonly string[]).includes(v)
}

// XCU-18 — validate a mode value, failing loud on garbage. The choice itself is
// per-use and the caller's (the P6 picker, XCU-18u); this only validates it.
// `[FACT: ADR-015:46 (§3.1 "a per-use, informed choice, not a global setting")]`
export function resolveMode(mode: string): AiMode {
  if (!isMode(mode)) throw new UnknownAiMode(String(mode))
  return mode
}

// XCU-20 / XCU-26 — the honest bound per mode, verbatim from ADR-015 §3.2. "The
// biggest dent in the system, named plainly" for cloud; "not a bare leaks-nothing
// absolute" for on-device. The P6 consent UI renders it; this service only
// computes it.
// `[FACT: ADR-015:20-21 (§1), :48-52 (§3.2), :43 (§3.1 table residual)]`
const DISCLOSURES: Record<AiMode, AiModeDisclosure> = {
  on_device: {
    mode: 'on_device',
    whoSees:
      'no one for content; only the model source at acquisition time (which model/version + IP/timing)',
    whatLeaks:
      'no vault content — the ZK-safe-for-content path; residual = acquiring the local model (mitigable via the ADR-014 Layer-2 whole-set/mirror discipline); runtime must be telemetry-off / no-ambient-network',
    serverPosture: 'blind',
  },
  cloud: {
    mode: 'cloud',
    whoSees:
      'the model provider you chose (Anthropic/OpenAI/…) — a named third-party observer',
    whatLeaks:
      'the user-chosen slice of vault content, in PLAINTEXT (content, not metadata), plus your IP + API-key identity and a cross-call profile over time; provider no-train/zero-retention is REQUESTED where offered but cannot be verified — disclosed as requested, not guaranteed',
    serverPosture: 'blind (device→provider direct — a cloud call never touches our server, ZK-1)',
  },
}

// Named `buildAiDisclosure` (not `buildDisclosure`) — the ingestion tier already
// exports a per-LAYER `buildDisclosure`; the two foundation barrels share a
// namespace, so the AI per-MODE builder is disambiguated at the source.
export function buildAiDisclosure(mode: AiMode): AiModeDisclosure {
  if (!isMode(mode)) throw new UnknownAiMode(String(mode))
  return DISCLOSURES[mode]
}

// XCU-24 — stamp model-generated content with `source = 'ai'` (the manual|ai|import
// triad). A pure, idempotent helper; the row is WRITTEN by each module's own
// service (over the ADR-004 §3.2.5 rail), never here — there is no store in this
// tier. `[FACT: ADR-015:64 (§3.6); xcut-ingestion-ai.md:42 ("writes via each module's service")]`
export function stampAiProvenance<T extends object>(row: T): T & { source: AiProvenance } {
  return { ...row, source: AI_PROVENANCE }
}
