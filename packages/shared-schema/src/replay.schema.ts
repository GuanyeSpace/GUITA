import { z } from 'zod'

export const ReplayStatusEnum = z.enum(['draft', 'published', 'archived'])

export const VideoSourceTypeEnum = z.enum(['external', 'cos', 'vod'])

export const ReplayListQuerySchema = z.object({
  host: z.string().min(1).max(64).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const ReplayListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  coverUrl: z.string().nullable(),
  durationSeconds: z.number().int(),
  liveAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  host: z.object({
    id: z.string(),
    slug: z.string(),
    displayName: z.string(),
  }),
  progress: z
    .object({
      positionSeconds: z.number().int(),
      completed: z.boolean(),
      lastViewedAt: z.string(),
    })
    .nullable(),
})

export const ReplayListResponseSchema = z.object({
  items: z.array(ReplayListItemSchema),
  nextCursor: z.string().nullable(),
})

export const ReplayDetailSchema = ReplayListItemSchema.extend({
  description: z.string().nullable(),
  videoUrl: z.string(),
  videoSource: VideoSourceTypeEnum,
})

export const ProgressUpsertRequestSchema = z.object({
  positionSeconds: z.number().int().min(0),
  durationSeconds: z.number().int().min(1),
})

export const ProgressUpsertResponseSchema = z.object({
  positionSeconds: z.number().int(),
  durationSeconds: z.number().int(),
  completed: z.boolean(),
  completedAt: z.string().nullable(),
})

export const MyReplaysQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const AdminCreateReplaySchema = z.object({
  hostId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  coverUrl: z.string().url().optional(),
  videoUrl: z.string().min(1),
  videoSource: VideoSourceTypeEnum.default('external'),
  durationSeconds: z.number().int().min(1),
  liveAt: z.string().datetime().optional(),
})

export const AdminUpdateReplaySchema = AdminCreateReplaySchema.partial().extend({
  status: ReplayStatusEnum.optional(),
})

export const AdminReplayItemSchema = ReplayDetailSchema.extend({
  status: ReplayStatusEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ReplayListQuery = z.infer<typeof ReplayListQuerySchema>
export type ReplayListItem = z.infer<typeof ReplayListItemSchema>
export type ReplayListResponse = z.infer<typeof ReplayListResponseSchema>
export type ReplayDetail = z.infer<typeof ReplayDetailSchema>
export type ProgressUpsertRequest = z.infer<typeof ProgressUpsertRequestSchema>
export type ProgressUpsertResponse = z.infer<typeof ProgressUpsertResponseSchema>
export type MyReplaysQuery = z.infer<typeof MyReplaysQuerySchema>
export type AdminCreateReplay = z.infer<typeof AdminCreateReplaySchema>
export type AdminUpdateReplay = z.infer<typeof AdminUpdateReplaySchema>
export type AdminReplayItem = z.infer<typeof AdminReplayItemSchema>
