import { ArchivalFileState } from '@/lib/archival/ArchivalFileState';
import { SerializedTezosBlockHeaderProof } from '@/lib/kontera/proof/TezosBlockHeaderProof';
import { GoogleCloudStorageService } from '@/modules/GoogleCloud/services/GoogleCloudStorageService';
import { JobCompleteCallback, PgBossConsumerService } from '@/modules/PgBossModule/services/PgBossConsumerService';
import { PgBossService } from '@/modules/PgBossModule/services/PgBossService';
import { WebhookQueueService } from '@/modules/WebhookModule/services/WebhookQueueService';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobWithDoneCallback } from 'pg-boss';
import { StampDTO } from '../controllers/dtos/StampDTO';
import { StampingService } from './StampingService';

export interface StampJobResponse {
  hash: string;
  proof: SerializedTezosBlockHeaderProof;
  archivalFileState: ArchivalFileState;
}

@Injectable()
export class StampQueueService extends PgBossConsumerService<StampDTO, StampJobResponse> {
  logger = new Logger(StampQueueService.name);
  queueName = 'stamp-queue';

  constructor(
    pgBossService: PgBossService,
    private webhookQueueService: WebhookQueueService,
    private stampingService: StampingService,
    configService: ConfigService,
    private googleCloudStorageService: GoogleCloudStorageService
  ) {
    super(pgBossService, {
      newJobCheckIntervalSeconds: parseInt(configService.get('STAMP_QUEUE_CHECK_INTERVAL_SECONDS', '60')),
      batchSize: parseInt(configService.get('STAMP_QUEUE_BATCH_SIZE', '100'))
    });
  }

  async handler(jobs: JobWithDoneCallback<StampDTO, StampJobResponse>[]) {
    const hashes = jobs.map((job) => job.data.hash);

    const serializedProofs = await this.stampingService.commit(hashes);

    // save proof for each file
    await Promise.all(
      Object.entries(serializedProofs).map(async ([fileHash, proof]) => {
        const foundJob = jobs.find((v) => v.data.hash === fileHash);

        if (!foundJob) {
          throw new Error('hash of file not found in batch, something must have went wrong!');
        }

        const archivalFileState = await this.googleCloudStorageService.archiver.archiveData(Buffer.from(JSON.stringify(proof)), {
          name: `${foundJob.data.fileId}.proof.json`,
          contentType: 'application/json'
        });

        foundJob.done(null, { hash: fileHash, proof, archivalFileState });
      })
    );
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
