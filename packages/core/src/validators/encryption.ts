import { z } from 'zod'
import { FIELD_CLASSIFICATION, VAULT_STATE } from '@vida/types'

export const FieldClassificationSchema = z.enum(FIELD_CLASSIFICATION)
export const VaultStateSchema = z.enum(VAULT_STATE)
