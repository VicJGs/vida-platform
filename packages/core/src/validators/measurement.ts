import { z } from 'zod'
import { MEASUREMENT_KIND, BINDING_MODE } from '@vida/types'

export const MeasurementKindSchema = z.enum(MEASUREMENT_KIND)
export const BindingModeSchema = z.enum(BINDING_MODE)
