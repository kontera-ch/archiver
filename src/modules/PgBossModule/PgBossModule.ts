import { EnvironmentVariables } from '@/EnvironmentVariables';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PgBoss from 'pg-boss';
import { PgBossService } from './services/PgBossService';

@Module({
  providers: [{
    provide: PgBossService,
    useFactory: async(configService: ConfigService<EnvironmentVariables>) => {
      const boss = new PgBoss({
        user: configService.get('PGBOSS_USERNAME', 'kontera'),
        password: configService.get('PGBOSS_PASSWORD', 'kontera'),
        database: configService.get('PGBOSS_DATABASE', 'kontera-pgboss'),
        host: configService.get('PGBOSS_HOST', 'localhost'),
        port: configService.get('PGBOSS_PORT', 5432),
        application_name: configService.get('PGBOSS_APPLICATION_NAME', 'kontera'),
        max: 1 // we limit the amount of connections pgBoss has to the PG to 1, as we will scale this with more nodes, not more connections
      });
  
      await boss.start();

      return new PgBossService(boss)
    },
    inject: [ConfigService]
  }],
  exports: [PgBossService]
})
export class PgBossModule {}
