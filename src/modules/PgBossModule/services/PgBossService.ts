import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import PgBoss from 'pg-boss';

@Injectable()
export class PgBossService implements OnApplicationShutdown {
  private readonly logger: Logger = new Logger(PgBossService.name);

  constructor(private boss: PgBoss) {
    boss.on('error', (error: any) => this.logger.error(error));
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log('stopping pgBoss gracefully...');

    if (this.boss) {
      await this.boss.stop({
        graceful: true,
        timeout: 60
      });

      this.logger.log('pgBoss stopped.');
      return
    }

    this.logger.log('pgBoss was not yet running!');
  }

  pgBoss(): PgBoss {
    return this.boss;
  }
}
