import { z } from 'zod'
import { DEVICE_PLATFORM } from '@vida/types'

export const DevicePlatformSchema = z.enum(DEVICE_PLATFORM)
