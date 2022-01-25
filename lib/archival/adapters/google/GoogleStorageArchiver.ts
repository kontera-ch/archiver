import { File } from '@google-cloud/storage';
import { ArchivalProofState } from 'lib/archival/ArchivalProofState';
import { ArchivalFileState } from '../../ArchivalFileState';
import { ColdStorageArchiver } from '../../ColdStorageArchiver';
import { GoogleStorageService } from './GoogleStorageService';

export class GoogleStorageArchiver implements ColdStorageArchiver {
  ADAPTER_TYPE = 'GOOGLE';
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

  async archiveFile(file: File, meta: { sha256Hash: string; originalFilename?: string }): Promise<ArchivalFileState> {
    const newFileName = meta.sha256Hash

    // change filename to sha256Hash, store old name
    meta.originalFilename = file.name;
    file.name = newFileName;

    const [copiedFile] = await file.copy(this.googleStorageService.gcsBucket, { metadata: meta });
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
      metadata: {
        archivedAt: metadata.timeCreated,
        md5Hash: metadata.md5Hash,
        sha256Hash: metadata.sha256Hash,
        size: metadata.size
      }
    };
  }
}
