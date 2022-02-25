import { Injectable, Logger } from '@nestjs/common';
import { NoopContract } from 'lib/tezos/contract/NoopContract';
import { TezosClient } from 'lib/tezos/TezosClient';
import { TezosSigner } from 'lib/tezos/TezosSigner';
import { Cron } from '@nestjs/schedule';
import { GoogleCloudStorageService } from '@/modules/GoogleCloud/services/GoogleCloudStorageService';
import axios from 'axios'

export interface ArchivalCallback {
  webhooks: string[]
}

@Injectable()
export class ArchivalService {
  private tezosSigner: TezosSigner;
  private logger = new Logger('ArchivalService');

  private callbackMap = new Map<string, ArchivalCallback>();

  constructor(tezosClient: TezosClient, tezosContract: NoopContract, private googleCloudStorageService: GoogleCloudStorageService) {
    this.tezosSigner = new TezosSigner(tezosContract.getContract(), tezosClient.toolkit, this.logger);
  }

  async stamp(hash: string, callback: ArchivalCallback) {
    this.callbackMap.set(hash, callback);
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
      hashes.map(async (hash) => {
        const jsonProof = Buffer.from(JSON.stringify(proof))

        const archivalFileState = await this.googleCloudStorageService.archiver.archiveData(jsonProof, {
          name: `${hash}.proof.json`,
          contentType: 'application/json'
        });

        if (this.callbackMap.has(hash)) {
          const archivalCallback = this.callbackMap.get(hash)!;

          for (const webhook of archivalCallback.webhooks) {
            try {
              this.logger.log(`calling webhook ${webhook}...`)
              axios.post(webhook, { hash, proof, archivalFileState })
            } catch (e) {
              // ToDo: this should be a task
              this.logger.error(`webhook ${webhook} could not be delivered`)
            }
          }

          this.callbackMap.delete(hash);
        }

        return archivalFileState;
      })
    );

    this.logger.log(`archived ${archivedProofs.length} proofs.`);
  }
}
