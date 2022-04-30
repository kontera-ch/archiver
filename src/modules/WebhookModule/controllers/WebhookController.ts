import { EnvironmentVariables } from '@/EnvironmentVariables';
import { JobResponseObject } from '@/modules/PgBossModule/services/PgBossConsumerService';
import { Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookQueueService } from '../services/WebhookQueueService';

@Controller('/api/webhooks')
export class WebhookController {
  constructor(private configService: ConfigService<EnvironmentVariables>, private readonly webhookQueueService: WebhookQueueService) {}

  @Post('flush')
  async flushWebhooks() {
    const webhookQueueConcurrency = parseInt(this.configService.get('WEBHOOK_QUEUE_CONCURRENCY', '5'))
    const jobResponses: JobResponseObject[] = []

    for (let i = 0; i < webhookQueueConcurrency; i++) {
      jobResponses.push(...await this.webhookQueueService.fetch())
    }

    return {
      queue: this.webhookQueueService.queueName,
      completed: jobResponses.length,
      success: jobResponses.filter(job => job.success === true).length,
      failed: jobResponses.filter(job => job.success === false).length
    };
  }
}
