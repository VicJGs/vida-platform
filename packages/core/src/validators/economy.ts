import { z } from 'zod'
import { CURRENCY_BACKING_KIND, CONSEQUENCE_KIND } from '@vida/types'

export const CurrencyBackingKindSchema = z.enum(CURRENCY_BACKING_KIND)
export const ConsequenceKindSchema = z.enum(CONSEQUENCE_KIND)
