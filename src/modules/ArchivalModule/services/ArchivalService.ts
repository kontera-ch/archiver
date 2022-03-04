import { Injectable, Logger } from '@nestjs/common';
import { NoopContract } from '@/lib/tezos/contract/NoopContract';
import { TezosClient } from '@/lib/tezos/TezosClient';
import { TezosSigner } from '@/lib/tezos/TezosSigner';
import { GoogleCloudStorageService } from '@/modules/GoogleCloud/services/GoogleCloudStorageService';
import axios from 'axios';
import { SerializedProof } from '@/lib/kontera/proof/SerializedProof';
import { ArchivalFileState } from '@/lib/archival/ArchivalFileState';
import { SerializedTezosBlockHeaderProof } from '@/lib/kontera/proof/TezosBlockHeaderProof';

export interface ArchivalCallback {
  webhooks: string[];
}

@Injectable()
export class ArchivalService {
  private tezosSigner: TezosSigner;
  private logger = new Logger('ArchivalService');


  constructor(tezosClient: TezosClient, tezosContract: NoopContract, private googleCloudStorageService: GoogleCloudStorageService) {
    this.tezosSigner = new TezosSigner(tezosContract.getContract(), tezosClient.toolkit, this.logger);
  }

  async commit(hashes: string[], callback: (callbackParams: { hash: string, proof: SerializedTezosBlockHeaderProof, archivalFileState: ArchivalFileState }[]) => void) {
    this.logger.log('commit initiated...');

    const serializedProofs = await this.tezosSigner.commit(new Set(hashes));

    if (!serializedProofs) {
      this.logger.log('commit cancelled. no hashes to commit.');
      return;
    }

    this.logger.log(`committed ${Object.values(serializedProofs).length} hashes.`);
    this.logger.log(`archiving proofs...`);

    // save proof for each file
    const archivedProofs = await Promise.all(
      Object.entries(serializedProofs).map(async ([fileHash, proof]) => {
        const archivalFileState = await this.googleCloudStorageService.archiver.archiveData(Buffer.from(JSON.stringify(proof)), {
          name: `${fileHash}.proof.json`,
          contentType: 'application/json'
        });

        return { hash: fileHash, proof, archivalFileState }
      })
    );

    callback(archivedProofs)

    this.logger.log(`archived ${archivedProofs.length} proofs.`);
  }
}
