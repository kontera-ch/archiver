import { Injectable, Logger } from '@nestjs/common';
import { NoopContract } from 'lib/tezos/contract/NoopContract';
import { TezosClient } from 'lib/tezos/TezosClient';
import { TezosSigner } from 'lib/tezos/TezosSigner';
import { Cron } from '@nestjs/schedule';
import { GoogleCloudStorageService } from '@/modules/GoogleCloud/services/GoogleCloudStorageService';

@Injectable()
export class ArchivalService {
  private tezosSigner: TezosSigner;
  private logger = new Logger('ArchivalService')

  constructor(tezosClient: TezosClient, tezosContract: NoopContract, private googleCloudStorageService: GoogleCloudStorageService) {
    this.tezosSigner = new TezosSigner(tezosContract.getContract(), tezosClient.toolkit, this.logger);
  }

  async stamp(hash: string) {
    this.tezosSigner.stamp(hash);
  }

  @Cron('0 * * * * *') // do this every minute
  async commit() {
    this.logger.log('commit initiated...');
    const { proof, hashes } = await this.tezosSigner.commit();

    if (hashes.length === 0) {
      this.logger.log('commit cancelled. no hashes to commit.');
    }

    this.logger.log(`committed ${hashes.length} hashes.`);
    this.logger.log(`archiving proofs...`);

    // save proof for each file
    const archivedProofs = await Promise.all(
      hashes.map((hash) => {
        return this.googleCloudStorageService.archiver.archiveData(Buffer.from(JSON.stringify(proof)), { name: `${hash}.proof.json`, contentType: 'application/json' });
      })
    );

    this.logger.log(`archived ${archivedProofs.length} proofs.`);
  }
}
