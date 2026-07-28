import { z } from 'zod'
import { STATUS, PRIORITY, FREQUENCY, LIFE_DOMAIN, NOTIFICATION_TYPE } from '@vida/types'

export const StatusSchema = z.enum(STATUS)
export const PrioritySchema = z.enum(PRIORITY)
export const FrequencySchema = z.enum(FREQUENCY)
export const LifeDomainSchema = z.enum(LIFE_DOMAIN)
export const NotificationTypeSchema = z.enum(NOTIFICATION_TYPE)
