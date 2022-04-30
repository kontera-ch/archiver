import { EnvironmentVariables } from '@/EnvironmentVariables';
import { ArchivalFileState } from '@/lib/archival/ArchivalFileState';
import { GoogleCloudStorageService } from '@/modules/GoogleCloud/services/GoogleCloudStorageService';
import { JobCompleteCallback, JobResponseObject, PgBossConsumerService } from '@/modules/PgBossModule/services/PgBossConsumerService';
import { PgBossService } from '@/modules/PgBossModule/services/PgBossService';
import { WebhookQueueService } from '@/modules/WebhookModule/services/WebhookQueueService';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'pg-boss';
import { FileArchivalDTO } from '../controllers/dtos/FileArchivalDTO';

export interface ArchiveJobRequest extends FileArchivalDTO {}

export interface ArchiveJobResponse extends JobResponseObject {
  archivalFileState: ArchivalFileState;
}

@Injectable()
export class ArchiveQueueService extends PgBossConsumerService<ArchiveJobRequest, ArchiveJobResponse> {
  logger = new Logger(ArchiveQueueService.name);
  queueName = 'archive-queue';

  constructor(
    private googleCloudStorageService: GoogleCloudStorageService,
    protected pgBossService: PgBossService,
    private webhookQueueService: WebhookQueueService,
    configService: ConfigService<EnvironmentVariables>
  ) {
    super(pgBossService, configService, {
      newJobCheckIntervalSeconds: parseInt(configService.get('ARCHIVE_QUEUE_CHECK_INTERVAL_SECONDS', '5')),
      batchSize: parseInt(configService.get('ARCHIVE_QUEUE_CONCURRENCY', '5'))
    });
  }

  async handler(jobs: Job<ArchiveJobRequest>[]): Promise<ArchiveJobResponse[]> {
    const jobPromises = jobs.map(async (job) => {
      const file = await this.googleCloudStorageService.googleCloudStorageServiceForBucket(job.data.bucket).file(job.data.filePath);
      const fileName = `${job.data.fileId}.archive`;

      // check if we have previously archived this very file (TODO: do we need to hash in the user id or something?)
      const isFileArchived = await this.googleCloudStorageService.archiver.exists(fileName);

      if (isFileArchived) {
        return { jobId: job.id, success: true, archivalFileState: isFileArchived };
      }

      // we have not, so lets archive it
      const archivalFileState = await this.googleCloudStorageService.archiver.archiveFile(file, fileName, job.data.fileHash);

      return { jobId: job.id, success: true, archivalFileState: archivalFileState };
    });

    return Promise.all(jobPromises);
  }

  public async schedule(data: any) {
    super.schedule(data, {
      onComplete: true
    });
  }

  async complete(job: JobCompleteCallback<ArchiveJobRequest, ArchiveJobResponse>) {
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
