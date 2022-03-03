import { JobWithDoneCallback } from 'pg-boss';
import { PgBossConsumerService } from '@/modules/PgBossModule/services/PgBossConsumerService';
import { PgBossService } from '@/modules/PgBossModule/services/PgBossService';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { StampJobResponse } from './StampQueueService';

export interface StampWebhookJobRequest extends StampJobResponse {
  webhooks: string[];
}

export interface StampWebhookJobResponse {

}

@Injectable()
export class StampWebhookQueueService extends PgBossConsumerService<StampWebhookJobRequest, StampWebhookJobResponse> {
  logger = new Logger(StampWebhookQueueService.name);
  queueName = 'stamp-webhook-queue';

  constructor(pgBossService: PgBossService) {
    super(pgBossService);
  }

  async handler(job: JobWithDoneCallback<StampWebhookJobRequest, StampWebhookJobResponse>) {
    await Promise.all(
      job.data.webhooks.map((webhook) => {
        return axios.post(webhook, { hash: job.data.hash, archivalFileState: job.data.archivalFileState, proof: job.data.proof });
      })
    );
  }

  async complete() {
    return true
  }
}
