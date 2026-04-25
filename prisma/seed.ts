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
