import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PgBoss from 'pg-boss';

@Injectable()
export class PgBossService {

  private readonly logger: Logger = new Logger(PgBossService.name);
  private boss!: PgBoss

  constructor(private configService: ConfigService) {
    //
  }

  public async onModuleInit() {
    this.boss = new PgBoss({
      user: this.configService.get('PGBOSS_USERNAME'),
      password: this.configService.get('PGBOSS_PASSWORD'),
      database: this.configService.get('PGBOSS_DATABASE'),
      host: this.configService.get('PGBOSS_HOST'),
      port: this.configService.get('PGBOSST_PORT'),
      application_name: 'kontera-archiver'
    });
    
    this.boss.on('error', (error) => this.logger.error(error));

    await this.boss.start();
  }

  pgBoss(): PgBoss {
    return this.boss
  }
}
