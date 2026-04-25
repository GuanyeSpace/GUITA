import {
  LoginRequest,
  LoginResponse,
  LoginResponseSchema,
  LogoutQuery,
  LogoutRequest,
  MeResponse,
  MeResponseSchema,
  RefreshResponse,
  RefreshResponseSchema,
} from '@guita/shared-schema'
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import {
  Host,
  IdentityType,
  Prisma,
  SessionStatus,
  SourceChannel,
  User,
  UserHostRelationType,
} from '@prisma/client'
import { randomUUID } from 'node:crypto'


import { AuthTokenService } from './auth-token.service'
import { AUTH_ERROR_CODES, AUTH_EVENT_NAMES, SESSION_REDIS_KEY_PREFIX } from './auth.constants'
import { generateGuitaId } from '../common/guita-id'
import { PrismaService } from '../modules/prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import {
  WECHAT_MINIAPP_PROVIDER,
  type WechatMiniappProvider,
  type WechatMiniappSession,
} from './providers/wechat-miniapp.provider'
import { WECOM_PROVIDER, type WecomProvider } from './providers/wecom.provider'

type RequestContext = {
  ip: string | null
  userAgent: string | null
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly authTokenService: AuthTokenService,
    @Inject(WECHAT_MINIAPP_PROVIDER) private readonly wechatProvider: WechatMiniappProvider,
    @Inject(WECOM_PROVIDER) private readonly wecomProvider: WecomProvider,
  ) {}

  async login(payload: LoginRequest, context: RequestContext): Promise<LoginResponse> {
    const wechatSession = await this.wechatProvider.code2Session(payload.code)
    const resolvedExternalUserId = await this.resolveExternalUserId(payload)
    const existingWechatIdentity = await this.prisma.identity.findUnique({
      where: {
        type_externalId: {
          type: IdentityType.wechat_miniapp,
          externalId: wechatSession.openid,
        },
      },
      include: {
        user: true,
      },
    })

    let user = existingWechatIdentity?.user ?? null
    let isNewUser = false

    if (!user) {
      user = await this.createUserWithIdentities(wechatSession, resolvedExternalUserId)
      isNewUser = true
    } else {
      await this.syncExistingUserIdentities(user.id, wechatSession, resolvedExternalUserId)
    }

    const host = await this.resolveHost(payload.host)

    if (host) {
      await this.prisma.userHostRelation.upsert({
        where: {
          userId_hostId_relationType: {
            userId: user.id,
            hostId: host.id,
            relationType: UserHostRelationType.PARTICIPANT,
          },
        },
        update: {
          sourceChannel: SourceChannel.MINIAPP,
        },
        create: {
          userId: user.id,
          hostId: host.id,
          relationType: UserHostRelationType.PARTICIPANT,
          sourceChannel: SourceChannel.MINIAPP,
        },
      })
    }

    await this.prisma.event.create({
      data: {
        userId: user.id,
        hostId: host?.id,
        name: AUTH_EVENT_NAMES.LOGIN,
        channel: payload.channel,
        payload: {
          isNewUser,
          scene: payload.scene,
          host: payload.host ?? null,
          channel: payload.channel ?? null,
        } satisfies Prisma.InputJsonValue,
      },
    })

    const tokens = await this.issueTokenBundle(user.id, context)

    return LoginResponseSchema.parse({
      guitaId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresIn: tokens.accessTokenExpiresIn,
      isNewUser,
      host: host
        ? {
            id: host.id,
            slug: host.slug,
            displayName: host.displayName,
          }
        : null,
    })
  }

  async refresh(refreshToken: string, context: RequestContext): Promise<RefreshResponse> {
    const verifiedToken = await this.authTokenService.verifyRefreshToken(refreshToken)

    await this.assertSessionIsActive(verifiedToken.guitaId, verifiedToken.sessionId)
    await this.revokeSessionById(verifiedToken.sessionId, verifiedToken.guitaId)

    const tokens = await this.issueTokenBundle(verifiedToken.guitaId, context)

    return RefreshResponseSchema.parse({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresIn: tokens.accessTokenExpiresIn,
    })
  }

  async logout(guitaId: string, body: LogoutRequest, query: LogoutQuery) {
    let revokedSessionId: string | null = null
    let revokedAll = false

    if (query.all) {
      await this.revokeAllSessions(guitaId)
      revokedAll = true
    }

    if (body.refreshToken) {
      const verifiedToken = await this.authTokenService.verifyRefreshToken(body.refreshToken)

      if (verifiedToken.guitaId !== guitaId) {
        throw new UnauthorizedException({
          errorCode: AUTH_ERROR_CODES.INVALID_REFRESH_TOKEN,
          message: 'Refresh token does not belong to the current user',
        })
      }

      revokedSessionId = verifiedToken.sessionId
      await this.revokeSessionById(verifiedToken.sessionId, guitaId)
    }

    await this.prisma.event.create({
      data: {
        userId: guitaId,
        name: AUTH_EVENT_NAMES.LOGOUT,
        payload: {
          revokedAll,
          revokedSessionId,
        } satisfies Prisma.InputJsonValue,
      },
    })
  }

  async getMe(guitaId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: guitaId },
      include: {
        hostRelations: {
          include: {
            host: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!user) {
      throw new UnauthorizedException({
        errorCode: AUTH_ERROR_CODES.USER_NOT_FOUND,
        message: 'User was not found',
      })
    }

    return MeResponseSchema.parse({
      guitaId: user.id,
      nickname: user.nickname ?? null,
      avatarUrl: user.avatarUrl ?? null,
      phone: user.phone ?? null,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      hosts: user.hostRelations.map((relation) => ({
        id: relation.host.id,
        slug: relation.host.slug,
        displayName: relation.host.displayName,
        relationType: relation.relationType.toLowerCase(),
        bindAt: relation.createdAt.toISOString(),
      })),
    })
  }

  private async createUserWithIdentities(
    wechatSession: WechatMiniappSession,
    externalUserId?: string,
  ): Promise<User> {
    await this.assertIdentityAvailable(IdentityType.wechat_miniapp, wechatSession.openid)

    if (externalUserId) {
      await this.assertIdentityAvailable(IdentityType.wecom_external, externalUserId)
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const guitaId = generateGuitaId()
      const existingUser = await this.prisma.user.findUnique({ where: { id: guitaId } })

      if (existingUser) {
        continue
      }

      try {
        return await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              id: guitaId,
            },
          })

          await tx.identity.create({
            data: this.buildWechatIdentityCreateInput(guitaId, wechatSession),
          })

          if (externalUserId) {
            await tx.identity.create({
              data: {
                userId: guitaId,
                type: IdentityType.wecom_external,
                externalId: externalUserId,
              },
            })
          }

          return user
        })
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          continue
        }

        throw error
      }
    }

    throw new ConflictException({
      errorCode: AUTH_ERROR_CODES.USER_ID_GENERATION_FAILED,
      message: 'Failed to allocate a unique guita id after 5 attempts',
    })
  }

  private async syncExistingUserIdentities(
    userId: string,
    wechatSession: WechatMiniappSession,
    externalUserId?: string,
  ) {
    await this.prisma.identity.update({
      where: {
        type_externalId: {
          type: IdentityType.wechat_miniapp,
          externalId: wechatSession.openid,
        },
      },
      data: {
        unionId: wechatSession.unionid,
        ...(wechatSession.unionid
          ? {
              metadata: {
                unionId: wechatSession.unionid,
              } satisfies Prisma.InputJsonValue,
            }
          : {}),
      },
    })

    if (!externalUserId) {
      return
    }

    const existingExternalIdentity = await this.prisma.identity.findUnique({
      where: {
        type_externalId: {
          type: IdentityType.wecom_external,
          externalId: externalUserId,
        },
      },
    })

    if (existingExternalIdentity && existingExternalIdentity.userId !== userId) {
      throw new ConflictException({
        errorCode: AUTH_ERROR_CODES.IDENTITY_CONFLICT,
        message: 'WeCom identity is already linked to another user',
      })
    }

    if (!existingExternalIdentity) {
      await this.prisma.identity.create({
        data: {
          userId,
          type: IdentityType.wecom_external,
          externalId: externalUserId,
        },
      })
    }
  }

  private async resolveHost(hostSlug?: string): Promise<Host | null> {
    if (!hostSlug) {
      return null
    }

    const host = await this.prisma.host.findUnique({
      where: { slug: hostSlug },
    })

    if (!host) {
      throw new BadRequestException({
        errorCode: AUTH_ERROR_CODES.HOST_NOT_FOUND,
        message: `Host ${hostSlug} was not found`,
      })
    }

    return host
  }

  private async resolveExternalUserId(payload: LoginRequest) {
    if (payload.externalUserId) {
      return payload.externalUserId
    }

    if (payload.scene !== 'wework') {
      return undefined
    }

    const identity = await this.wecomProvider.resolveExternalUserId(payload.code)

    return identity.externalUserId
  }

  private async issueTokenBundle(guitaId: string, context: RequestContext) {
    const refreshTokenTtlSeconds = this.authTokenService.getRefreshTokenTtlSeconds()
    const session = await this.prisma.session.create({
      data: {
        id: randomUUID(),
        userId: guitaId,
        expiresAt: new Date(Date.now() + refreshTokenTtlSeconds * 1000),
        ip: context.ip,
        userAgent: context.userAgent,
      },
    })

    const accessToken = await this.authTokenService.signAccessToken(guitaId)
    const refreshToken = await this.authTokenService.signRefreshToken(guitaId, session.id)

    await this.redis.set(this.getSessionRedisKey(session.id), guitaId, refreshTokenTtlSeconds)

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.authTokenService.getAccessTokenTtlSeconds(),
      sessionId: session.id,
    }
  }

  private async assertSessionIsActive(guitaId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    })
    const redisUserId = await this.redis.get(this.getSessionRedisKey(sessionId))

    if (
      !session ||
      session.userId !== guitaId ||
      session.status !== SessionStatus.active ||
      session.expiresAt.getTime() <= Date.now() ||
      redisUserId !== guitaId
    ) {
      if (session?.status === SessionStatus.active && session.expiresAt.getTime() <= Date.now()) {
        await this.prisma.session.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.expired,
          },
        })
      }

      throw new UnauthorizedException({
        errorCode: AUTH_ERROR_CODES.INVALID_SESSION,
        message: 'Session is invalid, expired, or revoked',
      })
    }
  }

  private async revokeSessionById(sessionId: string, guitaId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      await this.redis.del(this.getSessionRedisKey(sessionId))
      return
    }

    if (session.userId !== guitaId) {
      throw new UnauthorizedException({
        errorCode: AUTH_ERROR_CODES.INVALID_SESSION,
        message: 'Session does not belong to the current user',
      })
    }

    await this.redis.del(this.getSessionRedisKey(sessionId))

    if (session.status === SessionStatus.active) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.revoked,
          revokedAt: new Date(),
        },
      })
    }
  }

  private async revokeAllSessions(guitaId: string) {
    const activeSessions = await this.prisma.session.findMany({
      where: {
        userId: guitaId,
        status: SessionStatus.active,
      },
      select: {
        id: true,
      },
    })

    await this.prisma.session.updateMany({
      where: {
        userId: guitaId,
        status: SessionStatus.active,
      },
      data: {
        status: SessionStatus.revoked,
        revokedAt: new Date(),
      },
    })

    await this.redis.del(...activeSessions.map((session) => this.getSessionRedisKey(session.id)))
  }

  private async assertIdentityAvailable(type: IdentityType, externalId: string) {
    const existingIdentity = await this.prisma.identity.findUnique({
      where: {
        type_externalId: {
          type,
          externalId,
        },
      },
    })

    if (existingIdentity) {
      throw new ConflictException({
        errorCode: AUTH_ERROR_CODES.IDENTITY_CONFLICT,
        message: `${type} identity is already linked to another user`,
      })
    }
  }

  private buildWechatIdentityCreateInput(guitaId: string, wechatSession: WechatMiniappSession): Prisma.IdentityUncheckedCreateInput {
    return {
      userId: guitaId,
      type: IdentityType.wechat_miniapp,
      externalId: wechatSession.openid,
      unionId: wechatSession.unionid,
      ...(wechatSession.unionid
        ? {
            metadata: {
              unionId: wechatSession.unionid,
            } satisfies Prisma.InputJsonValue,
          }
        : {}),
    }
  }

  private getSessionRedisKey(sessionId: string) {
    return `${SESSION_REDIS_KEY_PREFIX}${sessionId}`
  }

  private isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  }
}
