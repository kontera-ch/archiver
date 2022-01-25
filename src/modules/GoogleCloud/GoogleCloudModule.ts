import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleCloudStorageService } from './services/GoogleCloudStorageService';

@Module({
  imports: [ConfigModule],
  providers: [GoogleCloudStorageService],
  exports: [GoogleCloudStorageService]
})
export class GoogleCloudModule {}
