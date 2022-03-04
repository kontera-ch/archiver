import { Module } from '@nestjs/common';
import { PgBossModule } from '../PgBossModule/PgBossModule';
import { WebhookQueueService } from './services/WebhookQueueService';

@Module({
  imports: [PgBossModule],
  providers: [WebhookQueueService],
  exports: [WebhookQueueService]
})
export class WebhookModule {}
