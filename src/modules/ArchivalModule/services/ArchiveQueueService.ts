import { ArchivalFileState } from '@/lib/archival/ArchivalFileState';
import { GoogleCloudStorageService } from '@/modules/GoogleCloud/services/GoogleCloudStorageService';
import { PgBossConsumerService } from '@/modules/PgBossModule/services/PgBossConsumerService';
import { PgBossService } from '@/modules/PgBossModule/services/PgBossService';
import { Injectable, Logger } from '@nestjs/common';
import { JobWithDoneCallback } from 'pg-boss';
import { FileArchivalDTO } from '../controllers/dtos/FileArchivalDTO';
import { WebhookQueueService } from './WebhookQueueService';

export interface ArchiveJobRequest extends FileArchivalDTO {}

export interface ArchiveJobResponse {
  archivalFileState: ArchivalFileState;
}

@Injectable()
export class ArchiveQueueService extends PgBossConsumerService<ArchiveJobRequest, ArchiveJobResponse> {
  logger = new Logger(ArchiveQueueService.name);
  queueName = 'archive-queue';

  constructor(private googleCloudStorageService: GoogleCloudStorageService, pgBossService: PgBossService, private webhookQueueService: WebhookQueueService) {
    super(pgBossService);
  }

  async handler(job: JobWithDoneCallback<ArchiveJobRequest, ArchiveJobResponse>): Promise<any> {
    const file = await this.googleCloudStorageService.googleCloudStorageServiceForBucket(job.data.bucket).file(job.data.filePath);
    const fileName = `${job.data.fileHash}-${job.data.fileId}`;

    // check if we have previously archived this very file (TODO: do we need to hash in the user id or something?)
    const isFileArchived = await this.googleCloudStorageService.archiver.exists(fileName);

    if (isFileArchived) {
      return { archivalFileState: isFileArchived }
    }

    // we have not, so lets archive it
    const archivalFileState = await this.googleCloudStorageService.archiver.archiveFile(file, fileName, job.data.fileHash);

    return { archivalFileState }
  }

  public async schedule(data: any) {
    super.schedule(data, {
      onComplete: true
    });
  }

  async complete(job: { data: { request: { data: ArchiveJobRequest }; response: ArchiveJobResponse } }) {
    this.webhookQueueService.schedule({ webhooks: job.data.request.data.webhooks, webhookData: job.data.response },
      {
        retryBackoff: true,
        retryDelay: 60,
        retryLimit: 10,
        expireInSeconds: 5
      }
    );
  }
}