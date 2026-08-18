import { z } from 'zod'
import {
  CURRENCY_BACKING_KIND,
  CONSEQUENCE_KIND,
  STORE_NODE_KIND,
  STORE_REF_TYPE,
  RULE_CONDITION_BINDING_TYPE,
} from '@vida/types'

export const CurrencyBackingKindSchema = z.enum(CURRENCY_BACKING_KIND)
export const ConsequenceKindSchema = z.enum(CONSEQUENCE_KIND)
// DB-3: store + rules (ADR-012 §3.5/§3.9)
export const StoreNodeKindSchema = z.enum(STORE_NODE_KIND)
export const StoreRefTypeSchema = z.enum(STORE_REF_TYPE)
export const RuleConditionBindingTypeSchema = z.enum(RULE_CONDITION_BINDING_TYPE)
