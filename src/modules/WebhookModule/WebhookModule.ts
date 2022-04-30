import { Module } from '@nestjs/common';
import { PgBossModule } from '../PgBossModule/PgBossModule';
import { WebhookController } from './controllers/WebhookController';
import { WebhookQueueService } from './services/WebhookQueueService';

@Module({
  controllers: [WebhookController],
  imports: [PgBossModule],
  providers: [WebhookQueueService],
  exports: [WebhookQueueService]
})
export class WebhookModule {}
