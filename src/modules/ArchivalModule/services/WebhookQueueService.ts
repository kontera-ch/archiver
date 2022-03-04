import { JobWithDoneCallback } from 'pg-boss';
import { PgBossConsumerService } from '@/modules/PgBossModule/services/PgBossConsumerService';
import { PgBossService } from '@/modules/PgBossModule/services/PgBossService';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { StampJobResponse } from './StampQueueService';

export interface WebhookJobRequest {
  webhooks: string[];
  webhookData: any
}

export interface WebhookJobResponse {
}

@Injectable()
export class WebhookQueueService extends PgBossConsumerService<WebhookJobRequest, WebhookJobResponse> {
  logger = new Logger(WebhookQueueService.name);
  queueName = 'webhook-queue';

  constructor(pgBossService: PgBossService) {
    super(pgBossService);
  }

  async handler(job: JobWithDoneCallback<WebhookJobRequest, WebhookJobResponse>) {
    await Promise.all(
      job.data.webhooks.map((webhook) => {
        return axios.post(webhook, job.data.webhookData);
      })
    );
  }

  async complete() {
    return true
  }
}
