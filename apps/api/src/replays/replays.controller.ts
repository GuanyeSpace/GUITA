import {
  MyReplaysQuery,
  MyReplaysQuerySchema,
  ProgressUpsertRequest,
  ProgressUpsertRequestSchema,
  ProgressUpsertResponse,
  ReplayDetail,
  ReplayListQuery,
  ReplayListQuerySchema,
  ReplayListResponse,
} from '@guita/shared-schema'
import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common'

import { ReplaysService } from './replays.service'
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import {
  OptionalJwtAuthGuard,
  OptionallyAuthenticatedRequest,
} from '../auth/guards/optional-jwt-auth.guard'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'

@Controller('api/v1')
export class ReplaysController {
  constructor(@Inject(ReplaysService) private readonly replaysService: ReplaysService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get('replays')
  async list(
    @Query(new ZodValidationPipe(ReplayListQuerySchema)) query: ReplayListQuery,
    @Req() request: OptionallyAuthenticatedRequest,
  ): Promise<ReplayListResponse> {
    return this.replaysService.listPublished(query, request.user?.guitaId)
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('replays/:id')
  async detail(@Param('id') replayId: string, @Req() request: OptionallyAuthenticatedRequest): Promise<ReplayDetail> {
    return this.replaysService.getPublishedDetail(replayId, request.user?.guitaId)
  }

  @UseGuards(JwtAuthGuard)
  @Post('replays/:id/progress')
  async upsertProgress(
    @Param('id') replayId: string,
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(ProgressUpsertRequestSchema)) payload: ProgressUpsertRequest,
  ): Promise<ProgressUpsertResponse> {
    return this.replaysService.upsertProgress(replayId, request.user.guitaId, payload)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/replays')
  async mine(
    @Query(new ZodValidationPipe(MyReplaysQuerySchema)) query: MyReplaysQuery,
    @Req() request: AuthenticatedRequest,
  ): Promise<ReplayListResponse> {
    return this.replaysService.listMine(query, request.user.guitaId)
  }
}
