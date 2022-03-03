import { ArchivalFileState } from '@/lib/archival/ArchivalFileState';
import { SerializedTezosBlockHeaderProof } from '@/lib/kontera/proof/TezosBlockHeaderProof';
import { PgBossConsumerService } from '@/modules/PgBossModule/services/PgBossConsumerService';
import { PgBossService } from '@/modules/PgBossModule/services/PgBossService';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobWithDoneCallback } from 'pg-boss'
import { StampDTO } from '../controllers/dtos/StampDTO';
import { ArchivalService } from './ArchivalService';
import { StampWebhookQueueService } from './StampWebhookQueueService';

export interface StampJobResponse {
 hash: string; 
 proof: SerializedTezosBlockHeaderProof;
 archivalFileState: ArchivalFileState;
}

@Injectable()
export class StampQueueService extends PgBossConsumerService<StampDTO, StampJobResponse> {
  logger = new Logger(StampQueueService.name);
  queueName = 'stamp-queue';

  constructor(pgBossService: PgBossService, private stampWebhookQueueService: StampWebhookQueueService, private archivalService: ArchivalService, configService: ConfigService) {
    super(pgBossService, { newJobCheckIntervalSeconds: 60, batchSize: 100 });
  }

  async handler(jobs: JobWithDoneCallback<StampDTO, StampJobResponse>[]) {
    const hashes = jobs.map(job => job.data.hash)

    await this.archivalService.commit(hashes, (archivedProofs) => {
      archivedProofs.forEach(({ hash, proof, archivalFileState }) => {
        const foundJobs = jobs.filter(v => v.data.hash === hash)

        if (foundJobs.length === 0) {
          throw new Error('hash of file not found in batch, something must have went wrong!')
        }

        foundJobs.forEach(job => {
          job.done(null, { hash, proof, archivalFileState })
        })
      })
    })
  }

  public async schedule(data: any) {
    super.schedule(data, {
      expireInMinutes: 5,
      onComplete: true
    })
  }

  async complete(job: { data: { request: { data: StampDTO }, response: StampJobResponse }}) {
    this.stampWebhookQueueService.schedule({ webhooks: job.data.request.data.webhooks, ...job.data.response }, {
      retryBackoff: true,
      retryDelay: 60,
      retryLimit: 10,
      expireInSeconds: 5
    }) 
  }
}
