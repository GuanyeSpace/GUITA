import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.host.upsert({
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
