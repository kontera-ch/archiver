import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PgBoss from 'pg-boss';

@Injectable()
export class PgBossService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger: Logger = new Logger(PgBossService.name);
  private boss!: PgBoss;

  constructor(private configService: ConfigService) {
    //
  }

  async onModuleInit() {
    this.boss = new PgBoss({
      user: this.configService.get('PGBOSS_USERNAME', 'kontera'),
      password: this.configService.get('PGBOSS_PASSWORD', 'kontera'),
      database: this.configService.get('PGBOSS_DATABASE', 'kontera-pgboss'),
      host: this.configService.get('PGBOSS_HOST', 'localhost'),
      port: this.configService.get('PGBOSST_PORT', 5432),
      application_name: this.configService.get('PGBOSS_APPLICATION_NAME', 'kontera'),
      max: 1 // we limit the amount of connections pgBoss has to the PG to 1, as we will scale this with more nodes, not more connections
    });

    this.boss.on('error', (error: any) => this.logger.error(error));

    await this.boss.start();
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
