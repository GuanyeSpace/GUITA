import { z } from 'zod'

export const LoginRequestSchema = z.object({
  code: z.string().min(1),
  scene: z.enum(['wework', 'share', 'search', 'direct']),
  host: z.string().min(1).max(64).optional(),
  channel: z.string().max(64).optional(),
  externalUserId: z.string().optional(),
  encryptedData: z.string().optional(),
  iv: z.string().optional(),
})

export const LoginResponseSchema = z.object({
  guitaId: z.string().regex(/^GT[A-Z2-9]{12}$/),
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresIn: z.number().int().positive(),
  isNewUser: z.boolean(),
  host: z
    .object({
      id: z.string(),
      slug: z.string(),
      displayName: z.string(),
    })
    .nullable(),
})

export const RefreshRequestSchema = z.object({
  refreshToken: z.string(),
})

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresIn: z.number().int().positive(),
})

export const LogoutRequestSchema = z.object({
  refreshToken: z.string().optional(),
})

export const LogoutQuerySchema = z.object({
  all: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((value) => value === true || value === 'true'),
})

export const MeResponseSchema = z.object({
  guitaId: z.string(),
  nickname: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  phone: z.string().nullable(),
  status: z.enum(['active', 'inactive', 'banned', 'deleted']),
  createdAt: z.string(),
  hosts: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      displayName: z.string(),
      relationType: z.string(),
      bindAt: z.string(),
    }),
  ),
})

export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>
export type LogoutQuery = z.infer<typeof LogoutQuerySchema>
export type MeResponse = z.infer<typeof MeResponseSchema>
