import { Logger } from '@nestjs/common';
import { WorkOptions, JobWithDoneCallback, SendOptions } from 'pg-boss';
import { PgBossService } from './PgBossService';

export abstract class PgBossConsumerService<JobRequest extends object, JobResponse extends object> {
  public abstract readonly logger: Logger;
  public abstract readonly queueName: string;

  constructor(private pgBossService: PgBossService, private pgBossWorkOptions: WorkOptions = {}) {
    //
  }

  public async onModuleInit() {
    await this.pgBossService.pgBoss().work<JobRequest, JobResponse>(this.queueName, this.pgBossWorkOptions, (job) => {
      this.logger.log(`job [${Array.isArray(job) ? job.map(j => j.id) : job.id}] started`)
      this.handler(job)
    });
    await this.pgBossService.pgBoss().onComplete(this.queueName, this.complete.bind(this));
  }

  public async schedule(data: JobRequest, sendOptions?: SendOptions) {
    this.logger.log(`job scheduled`)

    if (sendOptions) {
      await this.pgBossService.pgBoss().send(this.queueName, data, sendOptions)
    } else {
      await this.pgBossService.pgBoss().send(this.queueName, data)
    }
  }

  public abstract handler(job: JobWithDoneCallback<JobRequest, JobResponse> | JobWithDoneCallback<JobRequest, JobResponse>[]): any
  public abstract complete(job: { data: { request: { data: JobRequest }, response: JobResponse }}): any
}
