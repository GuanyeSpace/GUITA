import {
  AdminCreateReplay,
  AdminReplayItem,
  AdminReplayItemSchema,
  AdminReplayListQuery,
  AdminReplayListResponse,
  AdminReplayListResponseSchema,
  AdminUpdateReplay,
  MyReplaysQuery,
  ProgressUpsertRequest,
  ProgressUpsertResponse,
  ProgressUpsertResponseSchema,
  ReplayDetail,
  ReplayDetailSchema,
  ReplayListItem,
  ReplayListQuery,
  ReplayListResponse,
  ReplayListResponseSchema,
} from '@guita/shared-schema'
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, ReplayStatus } from '@prisma/client'

import { REPLAY_ERROR_CODES, REPLAY_EVENT_NAMES } from './replay.constants'
import { PrismaService } from '../modules/prisma/prisma.service'

type ReplayWithHostAndProgress = Prisma.LiveReplayGetPayload<{
  include: {
    host: true
    progresses: true
  }
}>

type AdminReplayWithHost = Prisma.LiveReplayGetPayload<{
  include: {
    host: true
  }
}>

@Injectable()
export class ReplaysService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listPublished(query: ReplayListQuery, guitaId?: string): Promise<ReplayListResponse> {
    if (query.host) {
      await this.assertHostExistsBySlug(query.host)
    }

    const replays = await this.prisma.liveReplay.findMany({
      where: {
        status: ReplayStatus.published,
        ...(query.host ? { host: { slug: query.host } } : {}),
      },
      include: this.getReplayInclude(guitaId),
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })

    return this.toReplayListResponse(replays, query.limit, Boolean(guitaId))
  }

  async getPublishedDetail(replayId: string, guitaId?: string): Promise<ReplayDetail> {
    const replay = await this.prisma.liveReplay.findFirst({
      where: {
        id: replayId,
        status: ReplayStatus.published,
      },
      include: this.getReplayInclude(guitaId),
    })

    if (!replay) {
      throw new NotFoundException({
        errorCode: REPLAY_ERROR_CODES.NOT_FOUND,
        message: 'Replay was not found',
      })
    }

    if (guitaId) {
      await this.prisma.event.create({
        data: {
          userId: guitaId,
          hostId: replay.hostId,
          name: REPLAY_EVENT_NAMES.OPEN,
          payload: {
            replayId: replay.id,
          } satisfies Prisma.InputJsonValue,
        },
      })
    }

    return ReplayDetailSchema.parse(this.toReplayDetail(replay, Boolean(guitaId)))
  }

  async upsertProgress(
    replayId: string,
    guitaId: string,
    payload: ProgressUpsertRequest,
  ): Promise<ProgressUpsertResponse> {
    const replay = await this.prisma.liveReplay.findFirst({
      where: {
        id: replayId,
        status: ReplayStatus.published,
      },
      select: {
        id: true,
        hostId: true,
      },
    })

    if (!replay) {
      throw new NotFoundException({
        errorCode: REPLAY_ERROR_CODES.NOT_FOUND,
        message: 'Replay was not found',
      })
    }

    const progress = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.userReplayProgress.findUnique({
        where: {
          userId_replayId: {
            userId: guitaId,
            replayId,
          },
        },
      })
      const now = new Date()
      const positionSeconds = Math.max(existing?.positionSeconds ?? 0, payload.positionSeconds)
      const durationSeconds = Math.max(existing?.durationSeconds ?? 0, payload.durationSeconds)
      const completed = existing?.completed || positionSeconds / durationSeconds >= 0.9
      const firstCompletion = completed && !existing?.completed
      const completedAt = firstCompletion ? now : existing?.completedAt ?? null

      const nextProgress = await tx.userReplayProgress.upsert({
        where: {
          userId_replayId: {
            userId: guitaId,
            replayId,
          },
        },
        update: {
          positionSeconds,
          durationSeconds,
          completed,
          completedAt,
          lastViewedAt: now,
        },
        create: {
          userId: guitaId,
          replayId,
          positionSeconds,
          durationSeconds,
          completed,
          completedAt,
          lastViewedAt: now,
        },
      })

      if (firstCompletion) {
        await tx.event.create({
          data: {
            userId: guitaId,
            hostId: replay.hostId,
            name: REPLAY_EVENT_NAMES.COMPLETE,
            payload: {
              replayId,
              positionSeconds,
              durationSeconds,
            } satisfies Prisma.InputJsonValue,
          },
        })
      }

      return nextProgress
    })

    return ProgressUpsertResponseSchema.parse({
      positionSeconds: progress.positionSeconds,
      durationSeconds: progress.durationSeconds,
      completed: progress.completed,
      completedAt: progress.completedAt?.toISOString() ?? null,
    })
  }

  async listMine(query: MyReplaysQuery, guitaId: string): Promise<ReplayListResponse> {
    const progresses = await this.prisma.userReplayProgress.findMany({
      where: {
        userId: guitaId,
        replay: {
          status: ReplayStatus.published,
        },
      },
      include: {
        replay: {
          include: {
            host: true,
          },
        },
      },
      orderBy: [{ lastViewedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })
    const nextCursor = progresses.length > query.limit ? progresses.pop()?.id ?? null : null
    const items = progresses.map((progress) =>
      this.toReplayListItem(
        {
          ...progress.replay,
          progresses: [progress],
        },
        true,
      ),
    )

    return ReplayListResponseSchema.parse({
      items,
      nextCursor,
    })
  }

  async adminList(query: AdminReplayListQuery): Promise<AdminReplayListResponse> {
    if (query.host) {
      await this.assertHostExistsBySlug(query.host)
    }

    const replays = await this.prisma.liveReplay.findMany({
      where: {
        ...(query.host ? { host: { slug: query.host } } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        host: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })
    const nextCursor = replays.length > query.limit ? replays.pop()?.id ?? null : null

    return AdminReplayListResponseSchema.parse({
      items: replays.map((replay) => this.toAdminReplayItem(replay)),
      nextCursor,
    })
  }

  async adminCreate(payload: AdminCreateReplay): Promise<AdminReplayItem> {
    await this.assertHostExistsById(payload.hostId)

    const replay = await this.prisma.liveReplay.create({
      data: {
        hostId: payload.hostId,
        title: payload.title,
        description: payload.description,
        coverUrl: payload.coverUrl,
        videoUrl: payload.videoUrl,
        videoSource: payload.videoSource,
        durationSeconds: payload.durationSeconds,
        liveAt: payload.liveAt ? new Date(payload.liveAt) : undefined,
      },
      include: {
        host: true,
      },
    })

    return this.toAdminReplayItem(replay)
  }

  async adminUpdate(replayId: string, payload: AdminUpdateReplay): Promise<AdminReplayItem> {
    if (payload.hostId) {
      await this.assertHostExistsById(payload.hostId)
    }

    await this.assertReplayExists(replayId)

    const replay = await this.prisma.liveReplay.update({
      where: { id: replayId },
      data: {
        hostId: payload.hostId,
        title: payload.title,
        description: payload.description,
        coverUrl: payload.coverUrl,
        videoUrl: payload.videoUrl,
        videoSource: payload.videoSource,
        durationSeconds: payload.durationSeconds,
        liveAt: payload.liveAt ? new Date(payload.liveAt) : undefined,
        status: payload.status,
      },
      include: {
        host: true,
      },
    })

    return this.toAdminReplayItem(replay)
  }

  async adminArchive(replayId: string): Promise<AdminReplayItem> {
    await this.assertReplayExists(replayId)

    const replay = await this.prisma.liveReplay.update({
      where: { id: replayId },
      data: {
        status: ReplayStatus.archived,
      },
      include: {
        host: true,
      },
    })

    return this.toAdminReplayItem(replay)
  }

  async adminPublish(replayId: string): Promise<AdminReplayItem> {
    await this.assertReplayExists(replayId)

    const replay = await this.prisma.liveReplay.update({
      where: { id: replayId },
      data: {
        status: ReplayStatus.published,
        publishedAt: new Date(),
      },
      include: {
        host: true,
      },
    })

    return this.toAdminReplayItem(replay)
  }

  private getReplayInclude(guitaId?: string) {
    return {
      host: true,
      progresses: {
        where: {
          userId: guitaId ?? '__anonymous__',
        },
        take: 1,
      },
    } satisfies Prisma.LiveReplayInclude
  }

  private toReplayListResponse(
    replays: ReplayWithHostAndProgress[],
    limit: number,
    includeProgressField: boolean,
  ): ReplayListResponse {
    const nextCursor = replays.length > limit ? replays.pop()?.id ?? null : null

    return ReplayListResponseSchema.parse({
      items: replays.map((replay) => this.toReplayListItem(replay, includeProgressField)),
      nextCursor,
    })
  }

  private toReplayDetail(replay: ReplayWithHostAndProgress, includeProgressField: boolean): ReplayDetail {
    return ReplayDetailSchema.parse({
      ...this.toReplayListItem(replay, includeProgressField),
      description: replay.description ?? null,
      videoUrl: replay.videoUrl,
      videoSource: replay.videoSource,
    })
  }

  private toReplayListItem(replay: ReplayWithHostAndProgress, includeProgressField: boolean): ReplayListItem {
    const progress = replay.progresses[0]
    const item = {
      id: replay.id,
      title: replay.title,
      coverUrl: replay.coverUrl ?? null,
      durationSeconds: replay.durationSeconds,
      liveAt: replay.liveAt?.toISOString() ?? null,
      publishedAt: replay.publishedAt?.toISOString() ?? null,
      host: {
        id: replay.host.id,
        slug: replay.host.slug,
        displayName: replay.host.displayName,
      },
    }

    if (!includeProgressField) {
      return item
    }

    return {
      ...item,
      progress: progress
        ? {
            positionSeconds: progress.positionSeconds,
            completed: progress.completed,
            lastViewedAt: progress.lastViewedAt.toISOString(),
          }
        : null,
    }
  }

  private toAdminReplayItem(replay: AdminReplayWithHost): AdminReplayItem {
    return AdminReplayItemSchema.parse({
      id: replay.id,
      title: replay.title,
      coverUrl: replay.coverUrl ?? null,
      durationSeconds: replay.durationSeconds,
      liveAt: replay.liveAt?.toISOString() ?? null,
      publishedAt: replay.publishedAt?.toISOString() ?? null,
      host: {
        id: replay.host.id,
        slug: replay.host.slug,
        displayName: replay.host.displayName,
      },
      progress: null,
      description: replay.description ?? null,
      videoUrl: replay.videoUrl,
      videoSource: replay.videoSource,
      status: replay.status,
      createdAt: replay.createdAt.toISOString(),
      updatedAt: replay.updatedAt.toISOString(),
    })
  }

  private async assertHostExistsBySlug(slug: string) {
    const host = await this.prisma.host.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!host) {
      throw new BadRequestException({
        errorCode: REPLAY_ERROR_CODES.HOST_NOT_FOUND,
        message: `Host ${slug} was not found`,
      })
    }
  }

  private async assertHostExistsById(hostId: string) {
    const host = await this.prisma.host.findUnique({
      where: { id: hostId },
      select: { id: true },
    })

    if (!host) {
      throw new BadRequestException({
        errorCode: REPLAY_ERROR_CODES.HOST_NOT_FOUND,
        message: `Host ${hostId} was not found`,
      })
    }
  }

  private async assertReplayExists(replayId: string) {
    const replay = await this.prisma.liveReplay.findUnique({
      where: { id: replayId },
      select: { id: true },
    })

    if (!replay) {
      throw new NotFoundException({
        errorCode: REPLAY_ERROR_CODES.NOT_FOUND,
        message: 'Replay was not found',
      })
    }
  }
}
