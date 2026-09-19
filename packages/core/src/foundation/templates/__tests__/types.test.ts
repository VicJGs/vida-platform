// S1 — xs-templates types/terminal-states/errors (ADR-009). Envelope-only.
import { describe, it, expect } from 'vitest'
import { INSTANTIATION_STATUS } from '@vida/types'
import { BundleSchema, InstantiationStatusSchema } from '../../../validators/template'
import { TemplateNotFound, TemplateCaptureError } from '../types'

describe('xs-templates S1 — BundleSchema (envelope only)', () => {
  it('parses a minimal envelope', () => {
    const res = BundleSchema.safeParse({
      root_tag: {},
      seed_entities: [],
      views: [],
      enabled_blocks: {},
    })
    expect(res.success).toBe(true)
  })

  it('parses a populated envelope (child_structure optional)', () => {
    const res = BundleSchema.safeParse({
      root_tag: { name: 'Languages' },
      seed_entities: [{ entity_type: 'task', data: {} }],
      views: [{ name: 'All', layout: 'list' }],
      enabled_blocks: [{ capability_def_id: 'cap_1' }],
      child_structure: [{ name: 'Spanish' }],
    })
    expect(res.success).toBe(true)
  })

  it('rejects a bundle missing root_tag (BR-S1-1; spaces.root_tag_id NOT NULL)', () => {
    const res = BundleSchema.safeParse({
      seed_entities: [],
      views: [],
      enabled_blocks: {},
    })
    expect(res.success).toBe(false)
  })

  it('rejects a bundle missing a required array member (seed_entities)', () => {
    const res = BundleSchema.safeParse({ root_tag: {}, views: [], enabled_blocks: {} })
    expect(res.success).toBe(false)
  })
})

describe('xs-templates S1 — INSTANTIATION_STATUS parity', () => {
  it('tuple ≡ z.enum options (no SQL CHECK — runtime type)', () => {
    expect(InstantiationStatusSchema.options).toEqual([...INSTANTIATION_STATUS])
  })

  it('carries exactly the three declared terminal states (ADR-009:108-110)', () => {
    expect([...INSTANTIATION_STATUS]).toEqual(['in-progress', 'success', 'partial-failure'])
  })
})

describe('xs-templates S1 — typed errors', () => {
  it('TemplateNotFound carries .name + readonly templateId', () => {
    const e = new TemplateNotFound('tpl_1')
    expect(e).toBeInstanceOf(Error)
    expect(e.name).toBe('TemplateNotFound')
    expect(e.templateId).toBe('tpl_1')
  })

  it('TemplateCaptureError carries .name + readonly reason', () => {
    const e = new TemplateCaptureError('references accumulated data')
    expect(e).toBeInstanceOf(Error)
    expect(e.name).toBe('TemplateCaptureError')
    expect(e.reason).toBe('references accumulated data')
  })
})
