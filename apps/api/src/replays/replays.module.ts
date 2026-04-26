import { Module } from '@nestjs/common'

import { ReplaysController } from './replays.controller'
import { ReplaysService } from './replays.service'
import { AuthModule } from '../auth/auth.module'
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard'

@Module({
  imports: [AuthModule],
  controllers: [ReplaysController],
  providers: [ReplaysService, OptionalJwtAuthGuard],
  exports: [ReplaysService],
})
export class ReplaysModule {}
