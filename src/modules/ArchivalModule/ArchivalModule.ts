import { Module } from '@nestjs/common';
import { NoopContract } from 'lib/tezos/contract/NoopContract';
import { TezosClient } from 'lib/tezos/TezosClient';
import { GoogleCloudModule } from '../GoogleCloud/GoogleCloudModule';
import { GoogleCloudStorageService } from '../GoogleCloud/services/GoogleCloudStorageService';
import { ArchivalController } from './controllers/ArchivalController';
import { ArchivalService } from './services/ArchivalService';

@Module({
  imports: [
    GoogleCloudModule
  ],
  controllers: [ArchivalController],
  providers: [
    {
    provide: ArchivalService,
    inject: [GoogleCloudStorageService],
    useFactory: async(googleCloudStorageService: GoogleCloudStorageService) => {
      const client = new TezosClient()
      const tezosContract = new NoopContract('KT1FzuCxZqCMNYW9rGEHMpHdRsrjZ7eqFS3U', client.toolkit)
      await tezosContract.init()
      return new ArchivalService(client, tezosContract, googleCloudStorageService)
    }
  }],
  exports: []
})
export class ArchivalModule {}
