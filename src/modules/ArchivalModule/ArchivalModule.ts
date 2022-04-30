import { Module } from '@nestjs/common';
import { GoogleCloudModule } from '../GoogleCloud/GoogleCloudModule';
import { ArchivalController } from './controllers/ArchivalController';
import { PgBossModule } from '../PgBossModule/PgBossModule';
import { ArchiveQueueService } from './services/ArchiveQueueService';
import { WebhookModule } from '../WebhookModule/WebhookModule';

@Module({
  imports: [GoogleCloudModule, WebhookModule, PgBossModule],
  controllers: [ArchivalController],
  providers: [ArchiveQueueService],
  exports: []
})
export class ArchivalModule {}
