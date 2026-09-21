// ============================================================================
// foundation/ai — agent-as-mediated-actor (S3 · XCU-21/23)
//
// An agent is a SANDBOXED actor with a decision-loop, not a privileged one. Its
// callable tool-set IS EXACTLY its ADR-010 granted envelope: a tool check is an
// envelope check, delegated verbatim to the enforcer #31 — any tool outside it
// FAILS CLOSED (XCU-21). Prompt-injection is bounded (XCU-23): untrusted-origin
// content carries provenance into the prompt; the other two mechanisms are COMPOSED
// — an injected tool-call still hits assertToolPermitted, an agent-composed egress
// still hits the S2 egress gate — so injection can misword the model but cannot
// exfiltrate past a consent gate the agent does not control. Holds no ambient
// authority; a binding tool-write rides the ADR-004 §3.2.5 rail (not a raw path).
// Factory-of-closures (no `this`).
// ============================================================================

import type { CapabilityEnforcer } from '../capability'
import {
  PROMPT_ORIGINS,
  type AiAgentGate,
  type AiTool,
  type BoundedPromptInput,
  type PromptSegment,
} from './types'

export function createAiAgentGate(enforcer: CapabilityEnforcer): AiAgentGate {
  // XCU-21 — the tool-set IS the granted envelope. assertPermitted throws
  // CapabilityDenied (no_grant / not_in_envelope / …) — that IS fail-closed. The
  // agent gate is a thin, honest delegate; it adds no authority and translates no
  // reason away. `[FACT: ADR-015:56; capability enforcer.assertPermitted]`
  async function assertToolPermitted(defId: string, tool: AiTool): Promise<void> {
    await enforcer.assertPermitted(defId, tool)
  }

  async function checkTool(defId: string, tool: AiTool): Promise<boolean> {
    const d = await enforcer.checkAction(defId, tool)
    return d.allowed
  }

  // XCU-23 — carry origin provenance into the prompt (mechanism 1 of 3). A segment
  // with an origin outside the known set is treated as untrusted (fail-safe: an
  // unknown provenance is never assumed trusted).
  function boundPromptInput(segments: PromptSegment[]): BoundedPromptInput {
    const normalized = segments.map((s): PromptSegment =>
      (PROMPT_ORIGINS as readonly string[]).includes(s.origin)
        ? s
        : { content: s.content, origin: 'untrusted' as const },
    )
    const hasUntrusted = normalized.some((s) => s.origin === 'untrusted')
    return { segments: normalized, hasUntrusted }
  }

  return { assertToolPermitted, checkTool, boundPromptInput }
}
