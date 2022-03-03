import { File } from '@google-cloud/storage';
import { ArchivalProofState } from '@/lib/archival/ArchivalProofState';
import { ArchivalFileState } from '../../ArchivalFileState';
import { ColdStorageArchiver } from '../../ColdStorageArchiver';
import { GoogleStorageService } from './GoogleStorageService';

export class GoogleStorageArchiver implements ColdStorageArchiver {
  ADAPTER_TYPE = 'GOOGLE_STORAGE';
  googleStorageService: GoogleStorageService;

  constructor(private archiveBucketName: string) {
    this.googleStorageService = new GoogleStorageService(this.archiveBucketName);
  }

  async archiveData(data: Buffer, meta: { name: string; contentType: string }): Promise<ArchivalFileState> {
    const file = await this.googleStorageService.uploadFile(data, meta.name, meta.contentType, {});
    const [metadata] = await file.getMetadata();
    return this.state(metadata.name);
  }

  async exists(hash: string): Promise<ArchivalFileState | undefined> {
    const exists = await this.googleStorageService.fileExists(hash);

    if (exists) {
      return this.state(hash);
    }
  }

  async archiveFile(file: File, sha256Hash: string): Promise<ArchivalFileState> {
    const [fileMetadata] = await file.getMetadata()

    const metadata = {
      originId: fileMetadata.id,
      originName: fileMetadata.name,
      originBucket: fileMetadata.bucket,
      contentType: fileMetadata.contentType,
      sha256Hash,
      originalFilename: file.name
    }

    // change filename to sha256Hash, store old name
    file.name = sha256Hash;

    const [copiedFile] = await file.copy(this.googleStorageService.gcsBucket, metadata);
    return this.state(copiedFile.name);
  }

  async proof(filename: string): Promise<ArchivalProofState> {
    const file = await this.googleStorageService.file(`${filename}.proof.json`);
    const [exists] = await file.exists()

    if (!exists) {
      return {
        status: 'pending'
      }
    }

    const [proof] = await file.download()

    return {
      status: 'committed',
      proof: JSON.parse(proof.toString())
    };
  }

  async state(filename: string): Promise<ArchivalFileState> {
    const file = await this.googleStorageService.file(filename);
    const [metadata] = await file.getMetadata();

    return {
      file: {
        filename: metadata.name,
        contentType: metadata.contentType
      },
      storage: {
        type: this.ADAPTER_TYPE,
        bucket: this.googleStorageService.gcsBucket.name,
        archivedAt: metadata.timeCreated,
      },
      metadata: {
        md5Hash: metadata.md5Hash,
        sha256Hash: metadata.sha256Hash,
        size: metadata.size
      }
    };
  }
}
