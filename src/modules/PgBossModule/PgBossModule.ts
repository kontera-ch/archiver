import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PgBossService } from './services/PgBossService';

@Module({
  imports: [ConfigModule],
  providers: [PgBossService],
  exports: [PgBossService]
})
export class PgBossModule {}
