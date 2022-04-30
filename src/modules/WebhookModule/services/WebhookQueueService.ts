import { Job } from 'pg-boss';
import { JobResponseObject, PgBossConsumerService } from '@/modules/PgBossModule/services/PgBossConsumerService';
import { PgBossService } from '@/modules/PgBossModule/services/PgBossService';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@/EnvironmentVariables';

export interface WebhookJobRequest {
  webhooks: string[];
  webhookData: any;
}

export interface WebhookJobResponse extends JobResponseObject {
  success: boolean;
}

@Injectable()
export class WebhookQueueService extends PgBossConsumerService<WebhookJobRequest, WebhookJobResponse> {
  logger = new Logger(WebhookQueueService.name);
  queueName = 'webhook-queue';

  constructor(pgBossService: PgBossService, configService: ConfigService<EnvironmentVariables>) {
    super(
      pgBossService,
      configService,
      {
        newJobCheckIntervalSeconds: parseInt(configService.get('WEBHOOK_QUEUE_CHECK_INTERVAL_SECONDS', '5')),
        batchSize: parseInt(configService.get('WEBHOOK_QUEUE_CONCURRENCY', '5'))
      },
    );
  }

  async handler(jobs: Job<WebhookJobRequest>[]): Promise<WebhookJobResponse[]> {
    const jobResponses = await Promise.all(
      jobs.map(async (job) => {
        await Promise.all(
          job.data.webhooks.map((webhook) => {
            this.logger.verbose(`triggering webhook [${webhook}]`);
            return axios.post(webhook, job.data.webhookData);
          })
        );

        return {
          jobId: job.id,
          success: true
        };
      })
    );

    return jobResponses;
  }
}
