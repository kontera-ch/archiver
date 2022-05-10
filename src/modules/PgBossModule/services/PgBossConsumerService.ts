import { Logger, OnModuleInit } from '@nestjs/common';
import { WorkOptions, Job, SendOptions } from 'pg-boss';
import { PgBossService } from './PgBossService';
import * as Sentry from '@sentry/node';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@/EnvironmentVariables';

export type JobCompleteCallback<JobRequest, JobResponse> = {
  data: { state: 'created' | 'retry' | 'active' | 'completed' | 'expired' | 'cancelled' | 'failed'; request: { data: JobRequest }; response: JobResponse };
};

export interface JobResponseObject extends Object {
  jobId: string
  success: boolean
}

export abstract class PgBossConsumerService<JobRequest extends Object, JobResponse extends JobResponseObject> implements OnModuleInit {
  public abstract readonly logger: Logger;
  public abstract readonly queueName: string;

  constructor(protected pgBossService: PgBossService, private configService: ConfigService<EnvironmentVariables>, protected pgBossWorkOptions: WorkOptions = {}) {
    //
  }

  public async onModuleInit() {
    const isPollingEnabled = this.configService.get<string | boolean>('TASK_QUEUE_POLLING_ENABLED', false) === 'true'

    if (isPollingEnabled) {
      this.logger.debug(`Queue Auto-Polling [${this.queueName}] [BatchSize=${this.pgBossWorkOptions.batchSize}] [Interval=${this.pgBossWorkOptions.newJobCheckIntervalSeconds}] [TeamConcurrency=${this.pgBossWorkOptions.teamConcurrency}]`);
      await this.pgBossService.pgBoss().work(this.queueName, this.handler)
    }
  }

  public async fetch(batchSize = 1): Promise<JobResponseObject[]> {
    const jobResponses: JobResponseObject[] = []

    for (let i = 0; i < batchSize; i++) {
      jobResponses.push(...await this.fetchBatch(1))
    }

    return jobResponses
  }

  public async fetchBatch(batchSize: number): Promise<JobResponseObject[]> {
    this.logger.debug(`Queue Triggered [${this.queueName}] [BatchSize=${batchSize}]`);

    const job = await this.pgBossService.pgBoss().fetch<JobRequest>(this.queueName, batchSize, this.pgBossWorkOptions);

    if (job) {
      this.logger.log(`job [${job.map((j) => j.id)}] started`);

      try {
        const jobResponses = await this.handler(job);
        this.logger.log(`job [${job.map((j) => j.id)}] finished`);

        await Promise.all(jobResponses.map(async jobResponse => {
          return this.pgBossService.pgBoss().complete(jobResponse.jobId, jobResponse);
        }))

        return jobResponses;
      } catch (error) {
        this.logger.warn(`job [${job.map((j) => j.id)}] failed`);
        this.logger.warn(error);

        await Promise.all(job.map(async job => {
          return this.pgBossService.pgBoss().fail(job.id, { error: String(error) });
        }))

        Sentry.captureException(error, {
          extra: {
            job: job.map((j) => j.id),
            jobData: job.map((j) => j.data)
          }
        });

        return job.map(job => ({ jobId: job.id, success: false }))
      }
    }

    return []
  }

  public async schedule(data: JobRequest, sendOptions?: SendOptions) {
    this.logger.log(`job scheduled`);

    if (sendOptions) {
      await this.pgBossService.pgBoss().send(this.queueName, data, sendOptions);
    } else {
      await this.pgBossService.pgBoss().send(this.queueName, data);
    }
  }

  public abstract handler(job: Job<JobRequest> | Job<JobRequest>[]): Promise<JobResponse[]>;
}
