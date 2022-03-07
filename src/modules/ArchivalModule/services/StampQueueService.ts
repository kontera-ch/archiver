import { ArchivalFileState } from '@/lib/archival/ArchivalFileState';
import { SerializedTezosBlockHeaderProof } from '@/lib/kontera/proof/TezosBlockHeaderProof';
import { JobCompleteCallback, PgBossConsumerService } from '@/modules/PgBossModule/services/PgBossConsumerService';
import { PgBossService } from '@/modules/PgBossModule/services/PgBossService';
import { WebhookQueueService } from '@/modules/WebhookModule/services/WebhookQueueService';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobWithDoneCallback } from 'pg-boss';
import { StampDTO } from '../controllers/dtos/StampDTO';
import { ArchivalService } from './ArchivalService';

export interface StampJobResponse {
  hash: string;
  proof: SerializedTezosBlockHeaderProof;
  archivalFileState: ArchivalFileState;
}

@Injectable()
export class StampQueueService extends PgBossConsumerService<StampDTO, StampJobResponse> {
  logger = new Logger(StampQueueService.name);
  queueName = 'stamp-queue';

  constructor(pgBossService: PgBossService, private webhookQueueService: WebhookQueueService, private archivalService: ArchivalService, configService: ConfigService) {
    super(pgBossService, {
      newJobCheckIntervalSeconds: parseInt(configService.get('STAMP_QUEUE_CHECK_INTERVAL_SECONDS', '60')),
      batchSize: parseInt(configService.get('STAMP_QUEUE_BATCH_SIZE', '100'))
    });
  }

  async handler(jobs: JobWithDoneCallback<StampDTO, StampJobResponse>[]) {
    const hashes = jobs.map((job) => job.data.hash);

    await this.archivalService.commit(hashes, (archivedProofs) => {
      archivedProofs.forEach(({ hash, proof, archivalFileState }) => {
        const foundJobs = jobs.filter((v) => v.data.hash === hash);

        if (foundJobs.length === 0) {
          throw new Error('hash of file not found in batch, something must have went wrong!');
        }

        foundJobs.forEach((job) => {
          job.done(null, { hash, proof, archivalFileState });
        });
      });
    });
  }

  public async schedule(data: any) {
    super.schedule(data, {
      expireInMinutes: 5,
      onComplete: true
    });
  }

  async complete(job: JobCompleteCallback<StampDTO, StampJobResponse>) {
    if (job.data.state === 'completed') {
      this.webhookQueueService.schedule(
        { webhooks: job.data.request.data.webhooks, webhookData: job.data.response },
        {
          retryBackoff: true,
          retryDelay: 60,
          retryLimit: 10,
          expireInSeconds: 5
        }
      );
    }
  }
}
