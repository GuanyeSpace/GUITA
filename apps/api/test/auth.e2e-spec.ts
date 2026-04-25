import assert from 'node:assert/strict'
import test from 'node:test'

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { SessionStatus } from '@prisma/client'
import request from 'supertest'

process.env.NODE_ENV ??= 'test'
process.env.PORT ??= '3001'
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/guita?schema=public'
process.env.REDIS_URL ??= 'redis://localhost:6379'
process.env.CORS_ORIGIN ??= 'http://localhost:3000'
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-1234567890'
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0987654321'
process.env.JWT_ACCESS_TTL_SECONDS ??= '3600'
process.env.JWT_REFRESH_TTL_SECONDS ??= '604800'
process.env.WECHAT_PROVIDER ??= 'mock'
process.env.WECOM_PROVIDER ??= 'mock'

import { AppModule } from '../src/app.module'
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter'
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe'
import { PrismaService } from '../src/modules/prisma/prisma.service'
import { RedisService } from '../src/redis/redis.service'

const SEEDED_USER_ID = 'GT22222222222A'

let app: INestApplication
let prisma: PrismaService
let redis: RedisService

async function loginWithCode(code: string, channel = '抖音直播') {
  return request(app.getHttpServer()).post('/api/v1/auth/login').send({
    code,
    scene: 'wework',
    host: 'linling',
    channel,
  })
}

async function resetState() {
  await redis.flushdb()
  await prisma.event.deleteMany()
  await prisma.session.deleteMany()
  await prisma.identity.deleteMany()
  await prisma.userHostRelation.deleteMany({
    where: {
      userId: {
        not: SEEDED_USER_ID,
      },
    },
  })
  await prisma.user.deleteMany({
    where: {
      id: {
        not: SEEDED_USER_ID,
      },
    },
  })
}

test.before(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  app = moduleRef.createNestApplication()
  app.useGlobalPipes(new ZodValidationPipe())
  app.useGlobalFilters(app.get(GlobalExceptionFilter))
  await app.init()

  prisma = app.get(PrismaService)
  redis = app.get(RedisService)
})

test.after(async () => {
  if (app) {
    await app.close()
  }
})

test.beforeEach(async () => {
  await resetState()
})

test('login first time creates user, identities, session, and event records', { concurrency: false }, async () => {
  const response = await loginWithCode('test_001')
  const guitaId = response.body.guitaId as string

  assert.equal(response.status, 201)
  assert.equal(response.body.isNewUser, true)
  assert.match(guitaId, /^GT[A-Z2-9]{12}$/)

  const [user, identities, sessions, events, relations] = await Promise.all([
    prisma.user.findUnique({ where: { id: guitaId } }),
    prisma.identity.findMany({ where: { userId: guitaId } }),
    prisma.session.findMany({ where: { userId: guitaId } }),
    prisma.event.findMany({ where: { userId: guitaId } }),
    prisma.userHostRelation.findMany({ where: { userId: guitaId } }),
  ])

  assert.ok(user)
  assert.equal(identities.length, 2)
  assert.equal(sessions.length, 1)
  assert.equal(events.length, 1)
  assert.equal(relations.length, 1)
})

test('login with the same code returns the existing user', { concurrency: false }, async () => {
  const firstResponse = await loginWithCode('test_001')
  const secondResponse = await loginWithCode('test_001')

  assert.equal(firstResponse.status, 201)
  assert.equal(secondResponse.status, 201)
  assert.equal(secondResponse.body.isNewUser, false)
  assert.equal(secondResponse.body.guitaId, firstResponse.body.guitaId)

  const createdUsers = await prisma.user.count({
    where: {
      id: {
        not: SEEDED_USER_ID,
      },
    },
  })

  assert.equal(createdUsers, 1)
})

test('login with a different code creates a new user', { concurrency: false }, async () => {
  const firstResponse = await loginWithCode('test_001')
  const secondResponse = await loginWithCode('test_002')

  assert.equal(firstResponse.status, 201)
  assert.equal(secondResponse.status, 201)
  assert.notEqual(firstResponse.body.guitaId, secondResponse.body.guitaId)

  const createdUsers = await prisma.user.count({
    where: {
      id: {
        not: SEEDED_USER_ID,
      },
    },
  })

  assert.equal(createdUsers, 2)
})

test('refresh rotates the refresh token and revokes the previous session', { concurrency: false }, async () => {
  const loginResponse = await loginWithCode('test_001')
  const refreshResponse = await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({
    refreshToken: loginResponse.body.refreshToken,
  })

  assert.equal(refreshResponse.status, 201)
  assert.notEqual(refreshResponse.body.refreshToken, loginResponse.body.refreshToken)
  assert.equal(typeof refreshResponse.body.accessToken, 'string')

  const sessions = await prisma.session.findMany({
    where: { userId: loginResponse.body.guitaId },
    orderBy: { issuedAt: 'asc' },
  })

  assert.equal(sessions.length, 2)
  assert.equal(sessions[0]?.status, SessionStatus.revoked)
  assert.ok(sessions[0]?.revokedAt)
  assert.equal(sessions[1]?.status, SessionStatus.active)
})

test('reusing an old refresh token returns 401', { concurrency: false }, async () => {
  const loginResponse = await loginWithCode('test_001')

  await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({
    refreshToken: loginResponse.body.refreshToken,
  })

  const retryResponse = await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({
    refreshToken: loginResponse.body.refreshToken,
  })

  assert.equal(retryResponse.status, 401)
})

test('me returns the authenticated user profile', { concurrency: false }, async () => {
  const loginResponse = await loginWithCode('test_001')
  const meResponse = await request(app.getHttpServer())
    .get('/api/v1/me')
    .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)

  assert.equal(meResponse.status, 200)
  assert.equal(meResponse.body.guitaId, loginResponse.body.guitaId)
  assert.equal(meResponse.body.status, 'active')
  assert.ok(
    meResponse.body.hosts.some(
      (host: { slug: string; relationType: string }) => host.slug === 'linling' && host.relationType === 'participant',
    ),
  )
})

test('logout revokes the current refresh session', { concurrency: false }, async () => {
  const loginResponse = await loginWithCode('test_001')
  const refreshResponse = await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({
    refreshToken: loginResponse.body.refreshToken,
  })

  const logoutResponse = await request(app.getHttpServer())
    .post('/api/v1/auth/logout')
    .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
    .send({ refreshToken: refreshResponse.body.refreshToken })

  assert.equal(logoutResponse.status, 204)

  const activeSessions = await prisma.session.count({
    where: {
      userId: loginResponse.body.guitaId,
      status: SessionStatus.active,
    },
  })

  assert.equal(activeSessions, 0)
})

test('a revoked refresh token cannot be used after logout', { concurrency: false }, async () => {
  const loginResponse = await loginWithCode('test_001')
  const refreshResponse = await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({
    refreshToken: loginResponse.body.refreshToken,
  })

  await request(app.getHttpServer())
    .post('/api/v1/auth/logout')
    .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
    .send({ refreshToken: refreshResponse.body.refreshToken })

  const retryResponse = await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({
    refreshToken: refreshResponse.body.refreshToken,
  })

  assert.equal(retryResponse.status, 401)
})
