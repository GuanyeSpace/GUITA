import { z } from 'zod'

export const UserSourceChannelSchema = z.enum(['miniapp', 'admin', 'api', 'ops'])

export const UserSchema = z.object({
  unionId: z.string().trim().min(1).max(128).optional().nullable(),
  nickname: z.string().trim().min(1).max(64).optional().nullable(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^1\d{10}$/, '手机号格式不正确')
    .optional()
    .nullable(),
  city: z.string().trim().min(1).max(64).optional().nullable(),
  sourceChannel: UserSourceChannelSchema.default('miniapp'),
})

export type User = z.infer<typeof UserSchema>
