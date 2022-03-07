import { Module } from '@nestjs/common';
import { GoogleCloudStorageService } from './services/GoogleCloudStorageService';

@Module({
  providers: [GoogleCloudStorageService],
  exports: [GoogleCloudStorageService]
})
export class GoogleCloudModule {}
