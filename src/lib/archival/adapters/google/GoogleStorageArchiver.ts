import { CopyOptions, File } from '@google-cloud/storage';
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

  async exists(name: string): Promise<ArchivalFileState | undefined> {
    const exists = await this.googleStorageService.fileExists(name);

    if (exists) {
      return this.state(name);
    }
  }

  async archiveFile(file: File, archiveFileName: string, sha256Hash: string): Promise<ArchivalFileState> {
    const [fileMetadata] = await file.getMetadata()

    const copyOptions: CopyOptions = {
      contentType: fileMetadata.contentType,
      metadata: {
        originId: fileMetadata.id,
        originName: fileMetadata.name,
        originBucket: fileMetadata.bucket,
        sha256Hash: sha256Hash,
        originalFilename: file.name
      }
    }

    // change filename to sha256Hash, store old name
    file.name = archiveFileName;

    const [copiedFile] = await file.copy(this.googleStorageService.gcsBucket, copyOptions);
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
    const [gsMetadata] = await file.getMetadata();

    return {
      file: {
        filename: gsMetadata.name,
        contentType: gsMetadata.contentType
      },
      storage: {
        type: this.ADAPTER_TYPE,
        bucket: this.googleStorageService.gcsBucket.name,
        archivedAt: gsMetadata.timeCreated,
      },
      metadata: {
        md5Hash: gsMetadata.md5Hash,
        sha256Hash: gsMetadata.metadata?.sha256Hash,
        size: gsMetadata.size
      }
    };
  }
}
