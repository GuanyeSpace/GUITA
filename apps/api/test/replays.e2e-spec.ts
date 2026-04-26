import assert from 'node:assert/strict'
import test from 'node:test'

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ReplayStatus } from '@prisma/client'
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
process.env.ADMIN_TOKEN ??= 'dev-admin-token-change-me'

import { AppModule } from '../src/app.module'
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter'
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe'
import { PrismaService } from '../src/modules/prisma/prisma.service'
import { RedisService } from '../src/redis/redis.service'

const SEEDED_USER_ID = 'GT22222222222A'
const SEEDED_REPLAY_IDS = ['seed-live-replay-linling-001', 'seed-live-replay-linling-002']
const ADMIN_TOKEN = 'dev-admin-token-change-me'

let app: INestApplication
let prisma: PrismaService
let redis: RedisService

async function resetState() {
  await redis.flushdb()
  await prisma.event.deleteMany()
  await prisma.session.deleteMany()
  await prisma.identity.deleteMany()
  await prisma.userReplayProgress.deleteMany()
  await prisma.liveReplay.deleteMany({
    where: {
      id: {
        notIn: SEEDED_REPLAY_IDS,
      },
    },
  })
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

async function login(code = 'replay_test_001') {
  const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
    code,
    scene: 'wework',
    host: 'linling',
  })

  assert.equal(response.status, 201)

  return response.body as {
    guitaId: string
    accessToken: string
    refreshToken: string
  }
}

async function getPublishedReplayId() {
  const replay = await prisma.liveReplay.findFirstOrThrow({
    where: {
      status: ReplayStatus.published,
    },
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
  })

  return replay.id
}

async function createAdminReplay(title = 'e2e test replay') {
  const host = await prisma.host.findUniqueOrThrow({
    where: { slug: 'linling' },
  })

  return request(app.getHttpServer())
    .post('/api/admin/replays')
    .set('X-Admin-Token', ADMIN_TOKEN)
    .send({
      hostId: host.id,
      title,
      videoUrl: 'https://example.com/e2e.mp4',
      durationSeconds: 600,
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

test('public list without token only returns published replays and omits progress', { concurrency: false }, async () => {
  const response = await request(app.getHttpServer()).get('/api/v1/replays')

  assert.equal(response.status, 200)
  assert.equal(response.body.items.length, 1)
  assert.equal(response.body.items[0].title, '灵灵·中老年甩臂操 第 1 期')
  assert.equal(Object.prototype.hasOwnProperty.call(response.body.items[0], 'progress'), false)
})

test('public list with token returns published replays with null progress', { concurrency: false }, async () => {
  const auth = await login()
  const response = await request(app.getHttpServer())
    .get('/api/v1/replays?host=linling')
    .set('Authorization', `Bearer ${auth.accessToken}`)

  assert.equal(response.status, 200)
  assert.equal(response.body.items.length, 1)
  assert.equal(response.body.items[0].progress, null)
})

test('published detail returns 200', { concurrency: false }, async () => {
  const replayId = await getPublishedReplayId()
  const response = await request(app.getHttpServer()).get(`/api/v1/replays/${replayId}`)

  assert.equal(response.status, 200)
  assert.equal(response.body.id, replayId)
  assert.equal(response.body.videoUrl, 'https://example.com/mock-replay-1.mp4')
})

test('draft detail returns 404', { concurrency: false }, async () => {
  const response = await request(app.getHttpServer()).get('/api/v1/replays/seed-live-replay-linling-002')

  assert.equal(response.status, 404)
})

test('progress at 100 seconds remains incomplete and keeps open event', { concurrency: false }, async () => {
  const auth = await login()
  const replayId = await getPublishedReplayId()

  await request(app.getHttpServer())
    .get(`/api/v1/replays/${replayId}`)
    .set('Authorization', `Bearer ${auth.accessToken}`)

  const response = await request(app.getHttpServer())
    .post(`/api/v1/replays/${replayId}/progress`)
    .set('Authorization', `Bearer ${auth.accessToken}`)
    .send({ positionSeconds: 100, durationSeconds: 1800 })

  assert.equal(response.status, 201)
  assert.equal(response.body.positionSeconds, 100)
  assert.equal(response.body.completed, false)

  const [progress, openEvents] = await Promise.all([
    prisma.userReplayProgress.findUnique({
      where: {
        userId_replayId: {
          userId: auth.guitaId,
          replayId,
        },
      },
    }),
    prisma.event.count({
      where: {
        userId: auth.guitaId,
        name: 'guita.replay.open',
      },
    }),
  ])

  assert.ok(progress)
  assert.equal(progress.positionSeconds, 100)
  assert.equal(openEvents, 1)
})

test('progress at 1700 seconds completes once and writes complete event', { concurrency: false }, async () => {
  const auth = await login()
  const replayId = await getPublishedReplayId()

  await request(app.getHttpServer())
    .post(`/api/v1/replays/${replayId}/progress`)
    .set('Authorization', `Bearer ${auth.accessToken}`)
    .send({ positionSeconds: 100, durationSeconds: 1800 })

  const response = await request(app.getHttpServer())
    .post(`/api/v1/replays/${replayId}/progress`)
    .set('Authorization', `Bearer ${auth.accessToken}`)
    .send({ positionSeconds: 1700, durationSeconds: 1800 })

  assert.equal(response.status, 201)
  assert.equal(response.body.positionSeconds, 1700)
  assert.equal(response.body.completed, true)
  assert.notEqual(response.body.completedAt, null)

  const completeEvents = await prisma.event.count({
    where: {
      userId: auth.guitaId,
      name: 'guita.replay.complete',
    },
  })

  assert.equal(completeEvents, 1)
})

test('progress cannot move backward after completion', { concurrency: false }, async () => {
  const auth = await login()
  const replayId = await getPublishedReplayId()

  await request(app.getHttpServer())
    .post(`/api/v1/replays/${replayId}/progress`)
    .set('Authorization', `Bearer ${auth.accessToken}`)
    .send({ positionSeconds: 1700, durationSeconds: 1800 })

  const response = await request(app.getHttpServer())
    .post(`/api/v1/replays/${replayId}/progress`)
    .set('Authorization', `Bearer ${auth.accessToken}`)
    .send({ positionSeconds: 500, durationSeconds: 1800 })

  assert.equal(response.status, 201)
  assert.equal(response.body.positionSeconds, 1700)
  assert.equal(response.body.completed, true)

  const completeEvents = await prisma.event.count({
    where: {
      userId: auth.guitaId,
      name: 'guita.replay.complete',
    },
  })

  assert.equal(completeEvents, 1)
})

test('me replays returns the watched replay', { concurrency: false }, async () => {
  const auth = await login()
  const replayId = await getPublishedReplayId()

  await request(app.getHttpServer())
    .post(`/api/v1/replays/${replayId}/progress`)
    .set('Authorization', `Bearer ${auth.accessToken}`)
    .send({ positionSeconds: 100, durationSeconds: 1800 })

  const response = await request(app.getHttpServer())
    .get('/api/v1/me/replays')
    .set('Authorization', `Bearer ${auth.accessToken}`)

  assert.equal(response.status, 200)
  assert.equal(response.body.items.length, 1)
  assert.equal(response.body.items[0].id, replayId)
  assert.equal(response.body.items[0].progress.positionSeconds, 100)
})

test('admin list without token returns 401', { concurrency: false }, async () => {
  const response = await request(app.getHttpServer()).get('/api/admin/replays')

  assert.equal(response.status, 401)
})

test('admin list with token returns published and draft replays', { concurrency: false }, async () => {
  const response = await request(app.getHttpServer())
    .get('/api/admin/replays')
    .set('X-Admin-Token', ADMIN_TOKEN)

  assert.equal(response.status, 200)
  assert.equal(response.body.items.length, 2)
  assert.ok(response.body.items.some((item: { status: string }) => item.status === 'published'))
  assert.ok(response.body.items.some((item: { status: string }) => item.status === 'draft'))
})

test('admin creates and updates replay', { concurrency: false }, async () => {
  const createResponse = await createAdminReplay()

  assert.equal(createResponse.status, 201)
  assert.equal(createResponse.body.status, 'draft')

  const updateResponse = await request(app.getHttpServer())
    .patch(`/api/admin/replays/${createResponse.body.id}`)
    .set('X-Admin-Token', ADMIN_TOKEN)
    .send({ title: 'updated e2e test replay' })

  assert.equal(updateResponse.status, 200)
  assert.equal(updateResponse.body.title, 'updated e2e test replay')
})

test('admin publishes replay', { concurrency: false }, async () => {
  const createResponse = await createAdminReplay()
  const publishResponse = await request(app.getHttpServer())
    .post(`/api/admin/replays/${createResponse.body.id}/publish`)
    .set('X-Admin-Token', ADMIN_TOKEN)

  assert.equal(publishResponse.status, 201)
  assert.equal(publishResponse.body.status, 'published')
  assert.notEqual(publishResponse.body.publishedAt, null)
})

test('admin delete archives replay and removes it from public list', { concurrency: false }, async () => {
  const createResponse = await createAdminReplay('archive me')

  await request(app.getHttpServer())
    .post(`/api/admin/replays/${createResponse.body.id}/publish`)
    .set('X-Admin-Token', ADMIN_TOKEN)

  const archiveResponse = await request(app.getHttpServer())
    .delete(`/api/admin/replays/${createResponse.body.id}`)
    .set('X-Admin-Token', ADMIN_TOKEN)

  assert.equal(archiveResponse.status, 200)
  assert.equal(archiveResponse.body.status, 'archived')

  const publicResponse = await request(app.getHttpServer()).get('/api/v1/replays')

  assert.equal(
    publicResponse.body.items.some((item: { id: string }) => item.id === createResponse.body.id),
    false,
  )
})
