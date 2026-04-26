import {
  AdminCreateReplay,
  AdminCreateReplaySchema,
  AdminReplayItem,
  AdminReplayListQuery,
  AdminReplayListQuerySchema,
  AdminReplayListResponse,
  AdminUpdateReplay,
  AdminUpdateReplaySchema,
} from '@guita/shared-schema'
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { ReplaysService } from '../../replays/replays.service'
import { AdminTokenGuard } from '../guards/admin-token.guard'

@UseGuards(AdminTokenGuard)
@Controller('api/admin/replays')
export class AdminReplaysController {
  constructor(@Inject(ReplaysService) private readonly replaysService: ReplaysService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(AdminReplayListQuerySchema)) query: AdminReplayListQuery,
  ): Promise<AdminReplayListResponse> {
    return this.replaysService.adminList(query)
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(AdminCreateReplaySchema)) payload: AdminCreateReplay,
  ): Promise<AdminReplayItem> {
    return this.replaysService.adminCreate(payload)
  }

  @Patch(':id')
  async update(
    @Param('id') replayId: string,
    @Body(new ZodValidationPipe(AdminUpdateReplaySchema)) payload: AdminUpdateReplay,
  ): Promise<AdminReplayItem> {
    return this.replaysService.adminUpdate(replayId, payload)
  }

  @Delete(':id')
  async archive(@Param('id') replayId: string): Promise<AdminReplayItem> {
    return this.replaysService.adminArchive(replayId)
  }

  @Post(':id/publish')
  async publish(@Param('id') replayId: string): Promise<AdminReplayItem> {
    return this.replaysService.adminPublish(replayId)
  }
}
