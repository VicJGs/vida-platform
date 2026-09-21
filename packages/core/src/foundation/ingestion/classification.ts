// ============================================================================
// foundation/ingestion — layer classification + honest-leak disclosure (S1)
//
// XCU-02 (three-layer classification, not a flat toggle) · XCU-03 (the honest-leak
// disclosure builder). Pure + deterministic — no enforcer, no ports, no I/O.
// ============================================================================

import {
  INGESTION_LAYERS,
  UnknownIngestionLayer,
  type IngestionLayer,
  type IngestionSource,
  type LeakDisclosure,
} from './types'

function isLayer(v: string): v is IngestionLayer {
  return (INGESTION_LAYERS as readonly string[]).includes(v)
}

// XCU-02 — classify a connector by its owning layer (not the fetch mechanism). A
// source declares its layer (temporal: Layer-3 today, Layer-1 after a native
// upgrade, ADR-014 §3.2); this validates + returns it, failing loud on garbage.
export function classifyLayer(source: IngestionSource): IngestionLayer {
  if (!isLayer(source.layer)) throw new UnknownIngestionLayer(String(source.layer))
  return source.layer
}

// XCU-03 — the honest-leak disclosure per layer, verbatim from the ADR-014 §3.2
// matrix (:56-60). "Disclosed, not pretended away" (ADR-014:20). The P6 consent UI
// renders it; this service only computes it.
const DISCLOSURES: Record<IngestionLayer, LeakDisclosure> = {
  native: {
    layer: 'native',
    whoSees: 'the trusted source the user already uses (Apple/Google Health, their bank)',
    whatLeaks: 'only what the user shares, to a party they already trusted with it',
    serverPosture: 'blind',
  },
  'public-reference': {
    layer: 'public-reference',
    whoSees: 'the source or Vida-mirror that serves the bulk dataset',
    whatLeaks:
      'which item = hidden (whole set fetched); corpus-use + IP/timing = disclosed to the server/mirror; live per-item prices still leak holdings',
    serverPosture: 'blind to content; a Vida mirror sees which datasets a device pulls + when',
  },
  'user-managed': {
    layer: 'user-managed',
    whoSees: 'whatever endpoint the user wires up (their own API key, a webhook target, possibly an aggregator)',
    whatLeaks: 'whatever the user configures to send — disclosed, user-owns-risk',
    serverPosture: 'blind',
  },
}

export function buildDisclosure(layer: IngestionLayer): LeakDisclosure {
  if (!isLayer(layer)) throw new UnknownIngestionLayer(String(layer))
  return DISCLOSURES[layer]
}
