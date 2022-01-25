import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleStorageArchiver } from 'lib/archival/adapters/google/GoogleStorageArchiver';
import { GoogleStorageService } from 'lib/archival/adapters/google/GoogleStorageService';

@Injectable()
export class GoogleCloudStorageService {
  archiver: GoogleStorageArchiver;

  constructor(private configService: ConfigService) {
    const bucketName = this.configService.get<string>('GCS_BUCKET_NAME');

    if (!bucketName) {
      throw new Error('please configure GCS_BUCKET_NAME');
    }

    this.archiver = new GoogleStorageArchiver(bucketName);
  }

  static googleCloudStorageServiceForBucket(bucketName: string) {
    return new GoogleStorageService(bucketName)
  }
}
