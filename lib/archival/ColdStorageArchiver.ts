import { ArchivalFileState } from './ArchivalFileState';

export interface ColdStorageArchiver {
  ADAPTER_TYPE: string;

  archiveData(data: Buffer, metadata: { name: string; contentType: string }): Promise<ArchivalFileState>;
  state(name: string): Promise<ArchivalFileState>;
}
