import { Module } from '@nestjs/common'

import { AdminReplaysController } from './admin-replays.controller'
import { ReplaysModule } from '../../replays/replays.module'
import { AdminTokenGuard } from '../guards/admin-token.guard'

@Module({
  imports: [ReplaysModule],
  controllers: [AdminReplaysController],
  providers: [AdminTokenGuard],
})
export class AdminReplaysModule {}
