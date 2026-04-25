import { z } from 'zod'

export const HostSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[a-z0-9-]+$/, 'slug 只能包含小写字母、数字和连字符')

export const HostAgeBandSchema = z.enum(['ACTIVE_SENIOR', 'ALL_ADULTS'])
export const HostMobilityLevelSchema = z.enum(['LOW_IMPACT', 'LIGHT_STRENGTH'])

export const HostSchema = z.object({
  slug: HostSlugSchema,
  displayName: z.string().trim().min(1).max(32),
  title: z.string().trim().min(1).max(64),
  tagline: z.string().trim().min(1).max(120),
  ageBand: HostAgeBandSchema,
  mobilityLevel: HostMobilityLevelSchema,
  isPublished: z.boolean().default(false),
})

export type Host = z.infer<typeof HostSchema>
export type HostSlug = z.infer<typeof HostSlugSchema>
