import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.client = new Redis(this.configService.get<string>('redis.url', 'redis://localhost:6379'), {
      lazyConnect: true,
      maxRetriesPerRequest: null,
    })
  }

  async onModuleInit() {
    if (this.client.status === 'wait') {
      await this.client.connect()
    }
  }

  async onModuleDestroy() {
    if (this.client.status === 'ready') {
      await this.client.quit()
    }
  }

  async get(key: string) {
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds)
    }

    return this.client.set(key, value)
  }

  async del(...keys: string[]) {
    if (keys.length === 0) {
      return 0
    }

    return this.client.del(...keys)
  }

  async flushdb() {
    return this.client.flushdb()
  }
}
