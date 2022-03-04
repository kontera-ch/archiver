import { JobWithDoneCallback } from 'pg-boss';
import { PgBossConsumerService } from '@/modules/PgBossModule/services/PgBossConsumerService';
import { PgBossService } from '@/modules/PgBossModule/services/PgBossService';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@/EnvironmentVariables';

export interface WebhookJobRequest {
  webhooks: string[];
  webhookData: any;
}

export interface WebhookJobResponse {}

@Injectable()
export class WebhookQueueService extends PgBossConsumerService<WebhookJobRequest, WebhookJobResponse> {
  logger = new Logger(WebhookQueueService.name);
  queueName = 'webhook-queue';

  constructor(pgBossService: PgBossService, configService: ConfigService<EnvironmentVariables>) {
    super(pgBossService, {
      newJobCheckIntervalSeconds: parseInt(configService.get('WEBHOOK_QUEUE_CHECK_INTERVAL_SECONDS', '5')),
      teamSize: parseInt(configService.get('WEBHOOK_QUEUE_CONCURRENCY', '5'))
    });
  }

  async handler(job: JobWithDoneCallback<WebhookJobRequest, WebhookJobResponse>) {
    await Promise.all(
      job.data.webhooks.map((webhook) => {
        return axios.post(webhook, job.data.webhookData);
      })
    );
  }
}
