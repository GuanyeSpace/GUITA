import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { AuthTokenService } from './auth-token.service'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { RedisModule } from '../redis/redis.module'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import {
  MockWechatMiniappProvider,
  RealWechatMiniappProvider,
  WECHAT_MINIAPP_PROVIDER,
} from './providers/wechat-miniapp.provider'
import { MockWecomProvider, RealWecomProvider, WECOM_PROVIDER } from './providers/wecom.provider'

@Module({
  imports: [RedisModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    JwtAuthGuard,
    MockWechatMiniappProvider,
    RealWechatMiniappProvider,
    MockWecomProvider,
    RealWecomProvider,
    {
      provide: WECHAT_MINIAPP_PROVIDER,
      inject: [ConfigService, MockWechatMiniappProvider, RealWechatMiniappProvider],
      useFactory: (
        configService: ConfigService,
        mockProvider: MockWechatMiniappProvider,
        realProvider: RealWechatMiniappProvider,
      ) => (configService.get<string>('providers.wechat', 'mock') === 'real' ? realProvider : mockProvider),
    },
    {
      provide: WECOM_PROVIDER,
      inject: [ConfigService, MockWecomProvider, RealWecomProvider],
      useFactory: (configService: ConfigService, mockProvider: MockWecomProvider, realProvider: RealWecomProvider) =>
        (configService.get<string>('providers.wecom', 'mock') === 'real' ? realProvider : mockProvider),
    },
  ],
  exports: [AuthTokenService, JwtAuthGuard],
})
export class AuthModule {}
