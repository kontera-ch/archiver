import { ColdStorageArchiver } from './ColdStorageArchiver';

export class Archiver {
  private adapters: ColdStorageArchiver[] = [];

  async registerColdStorageAdapter(adapter: ColdStorageArchiver): Promise<void> {
    this.adapters.push(adapter);
  }

  async unregisterColdStorageAdapter(adapter: ColdStorageArchiver): Promise<void> {
    this.adapters.splice(this.adapters.findIndex((v) => v.ADAPTER_TYPE === adapter.ADAPTER_TYPE, 1));
  }
}
