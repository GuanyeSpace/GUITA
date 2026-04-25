import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  WECHAT_PROVIDER: z.enum(['mock', 'real']).default('mock'),
  WECOM_PROVIDER: z.enum(['mock', 'real']).default('mock'),
})
.refine((environment) => environment.JWT_ACCESS_SECRET !== environment.JWT_REFRESH_SECRET, {
  message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different',
  path: ['JWT_REFRESH_SECRET'],
})

export type AppEnvironment = z.infer<typeof envSchema>

export function validateEnvironment(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config)

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '))
  }

  return parsed.data
}

export default function configuration() {
  const env = validateEnvironment(process.env as Record<string, unknown>)

  return {
    app: {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      corsOrigins: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    },
    auth: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
      refreshTtlSeconds: env.JWT_REFRESH_TTL_SECONDS,
    },
    providers: {
      wechat: env.WECHAT_PROVIDER,
      wecom: env.WECOM_PROVIDER,
    },
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      url: env.REDIS_URL,
    },
  }
}
