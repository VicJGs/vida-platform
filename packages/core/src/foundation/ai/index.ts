// Foundation substrate: the AI-application service tier (XS-ai #45 · ADR-015 §3.1-3.8 · XCU-17…27).
// Two per-use modes (on-device/agentic = ZK-safe · cloud BYO-key = a disclosed plaintext dent); our
// server blind in both. A cloud call IS an egress (rides #43); askModel is mediator-injected (the agent
// never holds the key); the tool-set IS the granted envelope (fails closed). Decides / discloses / gates;
// holds no credential, makes no network call. No schema at M1 — the durable stores + real runtime are M2.
export * from './types'
export { resolveMode, buildAiDisclosure, stampAiProvenance } from './modes'
export { createAiService } from './service'
export { createAiAgentGate } from './agent'
export { createAiConnectionRegistry } from './connections'
