// services/learning-education — barrel (mod-learning-education #52 ①)
// S1: hierarchy spine (institutions · self_taught · programs · curricula · terms) + resolveParentChain.
// S2–S10 append (subjects+DB-11 · fork · schedule/sessions · ICS · grading · assessments/GPA · measurement ·
// vault · cross-module+Journal) per docs/features/learning/education/delivery/slice-map.md.
export * from './types'
export * from './service'
export * from './journal'
