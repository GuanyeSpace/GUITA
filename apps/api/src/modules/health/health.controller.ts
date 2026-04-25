import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('healthz')
  healthz() {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    }
  }

  @Get('readyz')
  async readyz() {
    try {
      await this.prisma.$queryRaw`SELECT 1`

      return {
        status: 'ready',
        service: 'api',
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        reason: error instanceof Error ? error.message : 'unknown error',
      })
    }
  }
}
