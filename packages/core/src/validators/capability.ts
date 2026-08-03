import { z } from 'zod'
import { RENDER_TARGET } from '@vida/types'

export const RenderTargetSchema = z.enum(RENDER_TARGET)
