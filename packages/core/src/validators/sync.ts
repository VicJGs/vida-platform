import { z } from 'zod'
import { SYNC_STATUS, SYNC_OPERATION, SYNC_QUEUE_STATUS } from '@vida/types'

export const SyncStatusSchema = z.enum(SYNC_STATUS)
export const SyncOperationSchema = z.enum(SYNC_OPERATION)
export const SyncQueueStatusSchema = z.enum(SYNC_QUEUE_STATUS)
