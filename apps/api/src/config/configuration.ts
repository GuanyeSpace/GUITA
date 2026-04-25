import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
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
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      url: env.REDIS_URL,
    },
  }
}
