import { Bucket, File, Storage } from '@google-cloud/storage';

export class GoogleStorageService {
  gcsBucket: Bucket;

  constructor(gcsBucketName: string) {
    this.gcsBucket = new Bucket(new Storage(), gcsBucketName);
  }

  async uploadFile(buffer: Buffer, filename: string, contentType: string, metadata: any): Promise<File> {
    const uploadedFile = this.gcsBucket.file(filename);

    await uploadedFile.save(buffer, {
      contentType,
      metadata,
      validation: true
    });

    return uploadedFile;
  }

  static fromBucket(gcsBucketName: string): GoogleStorageService {
    return new GoogleStorageService(gcsBucketName);
  }

  async file(name: string): Promise<File> {
    return this.gcsBucket.file(name);
  }

  async fileExists(name: string): Promise<boolean> {
    const [exists] = await this.gcsBucket.file(name).exists();
    return exists;
  }
}
