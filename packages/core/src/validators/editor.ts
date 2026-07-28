import { z } from 'zod'
import {
  STANDARD_BLOCK_TYPE,
  INTEGRATION_BLOCK_TYPE,
  EXPORT_FORMAT,
  DAILY_SUMMARY_SECTION_TYPE,
  CHART_TYPE,
  SLASH_COMMAND_CATEGORY,
} from '@vida/types'

export const StandardBlockTypeSchema = z.enum(STANDARD_BLOCK_TYPE)
export const IntegrationBlockTypeSchema = z.enum(INTEGRATION_BLOCK_TYPE)
export const ExportFormatSchema = z.enum(EXPORT_FORMAT)
export const DailySummarySectionTypeSchema = z.enum(DAILY_SUMMARY_SECTION_TYPE)
export const ChartTypeSchema = z.enum(CHART_TYPE)
export const SlashCommandCategorySchema = z.enum(SLASH_COMMAND_CATEGORY)
