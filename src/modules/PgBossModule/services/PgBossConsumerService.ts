import { Logger, OnModuleInit } from '@nestjs/common';
import { WorkOptions, JobWithDoneCallback, SendOptions } from 'pg-boss';
import { PgBossService } from './PgBossService';
import * as Sentry from '@sentry/node';

export type JobCompleteCallback<JobRequest, JobResponse> = {
  data: { state: 'created' | 'retry' | 'active' | 'completed' | 'expired' | 'cancelled' | 'failed'; request: { data: JobRequest }; response: JobResponse };
};

export abstract class PgBossConsumerService<JobRequest extends object, JobResponse extends object> implements OnModuleInit {
  public abstract readonly logger: Logger;
  public abstract readonly queueName: string;

  constructor(private pgBossService: PgBossService, private pgBossWorkOptions: WorkOptions = {}) {
    //
  }

  public async onModuleInit() {
    this.logger.debug(
      `Queue [${this.queueName}] [BatchSize=${this.pgBossWorkOptions.batchSize || '1'}] [Concurrency=${this.pgBossWorkOptions.teamSize || 'default'}] [CHECK_INTERVAL=${
        this.pgBossWorkOptions.newJobCheckIntervalSeconds || '2'
      }s]`
    );

    await this.pgBossService.pgBoss().work<JobRequest, JobResponse>(this.queueName, this.pgBossWorkOptions, async (job) => {
      this.logger.log(`job [${Array.isArray(job) ? job.map((j) => j.id) : job.id}] started`);

      try {
        const response = await this.handler(job)
        this.logger.log(`job [${Array.isArray(job) ? job.map((j) => j.id) : job.id}] finished`);
        return response
      } catch (error) {
        this.logger.warn(`job [${Array.isArray(job) ? job.map((j) => j.id) : job.id}] failed`);
        this.logger.warn(error)
        
        Sentry.captureException(error, {
          extra: {
            job: Array.isArray(job) ? job.map(j => j.id) : job.id,
            jobData: Array.isArray(job) ? job.map(j => j.data) : job.data
          }
        });
        
        throw error
      }
    });

    await this.pgBossService.pgBoss().onComplete(this.queueName, this.complete.bind(this));
  }

  public async schedule(data: JobRequest, sendOptions?: SendOptions) {
    this.logger.log(`job scheduled`);

    if (sendOptions) {
      await this.pgBossService.pgBoss().send(this.queueName, data, sendOptions);
    } else {
      await this.pgBossService.pgBoss().send(this.queueName, data);
    }
  }

  public abstract handler(job: JobWithDoneCallback<JobRequest, JobResponse> | JobWithDoneCallback<JobRequest, JobResponse>[]): Promise<any>;

  public async complete(_job: JobCompleteCallback<JobRequest, JobResponse>): Promise<any> {
    return true;
  }
}
