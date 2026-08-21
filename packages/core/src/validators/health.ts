import { z } from 'zod'
import {
  HEALTH_METRIC_KIND,
  METRIC_DIRECTION,
  METRIC_SIDE,
  HEALTH_METRIC_VALUE_SOURCE,
  HEALTH_GOAL_HORIZON,
  ASSIGNED_EXAM_STATUS,
  HEALTH_EXPERIMENT_PILLAR,
  HEALTH_EXPERIMENT_PHASE,
  HEALTH_EXPERIMENT_SOURCE,
  MEDICAL_PROFILE_KIND,
  MEDICAL_PROFILE_SOURCE,
  SAFETY_FLAG_TRIGGER,
  SAFETY_FLAG_STATUS,
  PHYSICAL_ROLE_AUTHORING_SOURCE,
} from '@vida/types'

// DB-4 group #17 Health: Core — canonical Zod validators for the 14 net-new tuples (ADR-002 §2.3).
// Reused vocabs (MEASUREMENT_KIND / BINDING_MODE → measurement.ts; STATUS / FREQUENCY → common.ts)
// have their own validators. OPEN vocabs (modality / experiment-type / exam-kind / severity / …) carry
// no tuple → no validator (plain TEXT, no CHECK).
export const HealthMetricKindSchema = z.enum(HEALTH_METRIC_KIND)
export const MetricDirectionSchema = z.enum(METRIC_DIRECTION)
export const MetricSideSchema = z.enum(METRIC_SIDE)
export const HealthMetricValueSourceSchema = z.enum(HEALTH_METRIC_VALUE_SOURCE)
export const HealthGoalHorizonSchema = z.enum(HEALTH_GOAL_HORIZON)
export const AssignedExamStatusSchema = z.enum(ASSIGNED_EXAM_STATUS)
export const HealthExperimentPillarSchema = z.enum(HEALTH_EXPERIMENT_PILLAR)
export const HealthExperimentPhaseSchema = z.enum(HEALTH_EXPERIMENT_PHASE)
export const HealthExperimentSourceSchema = z.enum(HEALTH_EXPERIMENT_SOURCE)
export const MedicalProfileKindSchema = z.enum(MEDICAL_PROFILE_KIND)
export const MedicalProfileSourceSchema = z.enum(MEDICAL_PROFILE_SOURCE)
export const SafetyFlagTriggerSchema = z.enum(SAFETY_FLAG_TRIGGER)
export const SafetyFlagStatusSchema = z.enum(SAFETY_FLAG_STATUS)
export const PhysicalRoleAuthoringSourceSchema = z.enum(PHYSICAL_ROLE_AUTHORING_SOURCE)
