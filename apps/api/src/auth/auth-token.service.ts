
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SignJWT, jwtVerify } from 'jose'
import { TextEncoder } from 'node:util'

import { AUTH_ERROR_CODES } from './auth.constants'

const encoder = new TextEncoder()

@Injectable()
export class AuthTokenService {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  getAccessTokenTtlSeconds() {
    return this.configService.get<number>('auth.accessTtlSeconds', 3600)
  }

  getRefreshTokenTtlSeconds() {
    return this.configService.get<number>('auth.refreshTtlSeconds', 604800)
  }

  async signAccessToken(guitaId: string) {
    return new SignJWT({ type: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(guitaId)
      .setIssuedAt()
      .setExpirationTime(`${this.getAccessTokenTtlSeconds()}s`)
      .sign(encoder.encode(this.getAccessSecret()))
  }

  async signRefreshToken(guitaId: string, sessionId: string) {
    return new SignJWT({ type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(guitaId)
      .setJti(sessionId)
      .setIssuedAt()
      .setExpirationTime(`${this.getRefreshTokenTtlSeconds()}s`)
      .sign(encoder.encode(this.getRefreshSecret()))
  }

  async verifyAccessToken(token: string) {
    try {
      const { payload } = await jwtVerify(token, encoder.encode(this.getAccessSecret()), {
        algorithms: ['HS256'],
      })

      if (payload.type !== 'access' || typeof payload.sub !== 'string') {
        throw new UnauthorizedException({
          errorCode: AUTH_ERROR_CODES.INVALID_ACCESS_TOKEN,
          message: 'Access token payload is invalid',
        })
      }

      return { guitaId: payload.sub }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }

      throw new UnauthorizedException({
        errorCode: AUTH_ERROR_CODES.INVALID_ACCESS_TOKEN,
        message: 'Access token is invalid or expired',
      })
    }
  }

  async verifyRefreshToken(token: string) {
    try {
      const { payload } = await jwtVerify(token, encoder.encode(this.getRefreshSecret()), {
        algorithms: ['HS256'],
      })

      if (payload.type !== 'refresh' || typeof payload.sub !== 'string' || typeof payload.jti !== 'string') {
        throw new UnauthorizedException({
          errorCode: AUTH_ERROR_CODES.INVALID_REFRESH_TOKEN,
          message: 'Refresh token payload is invalid',
        })
      }

      return {
        guitaId: payload.sub,
        sessionId: payload.jti,
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }

      throw new UnauthorizedException({
        errorCode: AUTH_ERROR_CODES.INVALID_REFRESH_TOKEN,
        message: 'Refresh token is invalid or expired',
      })
    }
  }

  private getAccessSecret() {
    const secret = this.configService.get<string>('auth.accessSecret')

    if (!secret) {
      throw new Error('JWT access secret is missing')
    }

    return secret
  }

  private getRefreshSecret() {
    const secret = this.configService.get<string>('auth.refreshSecret')

    if (!secret) {
      throw new Error('JWT refresh secret is missing')
    }

    return secret
  }
}
