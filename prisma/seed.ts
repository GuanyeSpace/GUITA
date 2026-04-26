import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const linling = await prisma.host.upsert({
    where: { slug: 'linling' },
    update: {
      displayName: '灵灵',
      title: '灵灵·中老年运动',
      tagline: '稳稳动起来，轻松跟练。',
      ageBand: 'ACTIVE_SENIOR',
      mobilityLevel: 'LOW_IMPACT',
      isPublished: true,
    },
    create: {
      slug: 'linling',
      displayName: '灵灵',
      title: '灵灵·中老年运动',
      tagline: '稳稳动起来，轻松跟练。',
      ageBand: 'ACTIVE_SENIOR',
      mobilityLevel: 'LOW_IMPACT',
      isPublished: true,
    },
  })

  await prisma.host.upsert({
    where: { slug: 'zhiling' },
    update: {
      displayName: '智灵',
      title: '智灵·轻力量',
      tagline: '从轻开始，把力量练进日常。',
      ageBand: 'ALL_ADULTS',
      mobilityLevel: 'LIGHT_STRENGTH',
      isPublished: true,
    },
    create: {
      slug: 'zhiling',
      displayName: '智灵',
      title: '智灵·轻力量',
      tagline: '从轻开始，把力量练进日常。',
      ageBand: 'ALL_ADULTS',
      mobilityLevel: 'LIGHT_STRENGTH',
      isPublished: true,
    },
  })

  await prisma.liveReplay.upsert({
    where: { id: 'seed-live-replay-linling-001' },
    update: {
      hostId: linling.id,
      title: '灵灵·中老年甩臂操 第 1 期',
      status: 'published',
      videoUrl: 'https://example.com/mock-replay-1.mp4',
      videoSource: 'external',
      durationSeconds: 1800,
      publishedAt: new Date(),
      liveAt: new Date('2026-04-20T00:00:00.000Z'),
    },
    create: {
      id: 'seed-live-replay-linling-001',
      hostId: linling.id,
      title: '灵灵·中老年甩臂操 第 1 期',
      status: 'published',
      videoUrl: 'https://example.com/mock-replay-1.mp4',
      videoSource: 'external',
      durationSeconds: 1800,
      publishedAt: new Date(),
      liveAt: new Date('2026-04-20T00:00:00.000Z'),
    },
  })

  await prisma.liveReplay.upsert({
    where: { id: 'seed-live-replay-linling-002' },
    update: {
      hostId: linling.id,
      title: '灵灵·中老年甩臂操 第 2 期',
      status: 'draft',
      videoUrl: 'https://example.com/mock-replay-2.mp4',
      videoSource: 'external',
      durationSeconds: 1500,
      publishedAt: null,
      liveAt: null,
    },
    create: {
      id: 'seed-live-replay-linling-002',
      hostId: linling.id,
      title: '灵灵·中老年甩臂操 第 2 期',
      status: 'draft',
      videoUrl: 'https://example.com/mock-replay-2.mp4',
      videoSource: 'external',
      durationSeconds: 1500,
    },
  })

  await prisma.user.upsert({
    where: { id: 'GT22222222222A' },
    update: {
      nickname: '测试用户',
      status: 'active',
    },
    create: {
      id: 'GT22222222222A',
      nickname: '测试用户',
      status: 'active',
    },
  })

  await prisma.userHostRelation.upsert({
    where: {
      userId_hostId_relationType: {
        userId: 'GT22222222222A',
        hostId: linling.id,
        relationType: 'PARTICIPANT',
      },
    },
    update: {
      sourceChannel: 'MINIAPP',
    },
    create: {
      userId: 'GT22222222222A',
      hostId: linling.id,
      relationType: 'PARTICIPANT',
      sourceChannel: 'MINIAPP',
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
