import { Injectable, Logger } from '@nestjs/common';
import { NoopContract } from '@/lib/tezos/contract/NoopContract';
import { TezosClient } from '@/lib/tezos/TezosClient';
import { TezosSigner } from '@/lib/tezos/TezosSigner';
import { SerializedTezosBlockHeaderProof } from '@/lib/kontera/proof/TezosBlockHeaderProof';

@Injectable()
export class StampingService {
  private tezosSigner: TezosSigner;
  private logger = new Logger('ArchivalService');

  constructor(tezosClient: TezosClient, tezosContract: NoopContract) {
    this.tezosSigner = new TezosSigner(tezosContract.getContract(), tezosClient.toolkit, this.logger);
  }

  async commit(hashes: string[]): Promise<{ [x: string]: SerializedTezosBlockHeaderProof }> {
    this.logger.log('commit initiated...');

    const serializedProofs = await this.tezosSigner.commit(new Set(hashes));

    if (!serializedProofs) {
      this.logger.log('commit cancelled. no hashes to commit.');
      return {};
    }

    this.logger.log(`committed ${Object.values(serializedProofs).length} hashes.`);
    this.logger.log(`archiving proofs...`);

    this.logger.log(`archived ${Object.keys(serializedProofs).length} proofs.`);

    return serializedProofs
  }
}
