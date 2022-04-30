import { Injectable, Logger } from '@nestjs/common';
import { NoopContract } from '@/lib/tezos/contract/NoopContract';
import { TezosClient } from '@/lib/tezos/TezosClient';
import { TezosSigner } from '@/lib/tezos/TezosSigner';
import { SerializedTezosBlockHeaderProof } from '@/lib/kontera/proof/TezosBlockHeaderProof';
import { hexParse } from '@/lib/kontera/helpers/hexParse';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StampingService {
  private tezosSigner: TezosSigner;
  private logger = new Logger('ArchivalService');

  constructor(tezosClient: TezosClient, tezosContract: NoopContract, private readonly configService: ConfigService) {
    const pollingIntervalDurationSeconds = this.configService.get('TEZOS_TIMESTAMPING_POLLING_INTERVAL_DURATION_SECONDS')
    const requiredConfirmations = this.configService.get('TEZOS_TIMESTAMPING_REQUIRED_CONFIRMATIONS')

    if (pollingIntervalDurationSeconds > 20) {
      this.logger.warn('TEZOS_TIMESTAMPING_POLLING_INTERVAL_DURATION_SECONDS should not be set above 20 seconds, as you might miss blocks (block time ~ 30 seconds)')
    }

    // consider < 3 confirmations unsafe, tenderbake needs 3 confirmations to achieve finality
    if (requiredConfirmations < 3) {
      this.logger.warn('TEZOS_TIMESTAMPING_REQUIRED_CONFIRMATIONS below 3 can be considered unsafe')
    }

    this.tezosSigner = new TezosSigner(tezosContract.getContract(), tezosClient.toolkit, { pollingIntervalDurationSeconds, requiredConfirmations }, this.logger);
  }

  async commit(hashes: string[]): Promise<{ [x: string]: SerializedTezosBlockHeaderProof }> {
    this.logger.log('commit initiated...');

    const serializedProofs = await this.tezosSigner.commit(new Set(hashes.map((hash) => new Uint8Array(hexParse(hash)))));

    if (!serializedProofs) {
      this.logger.log('commit cancelled. no hashes to commit.');
      return {};
    }

    this.logger.log(`committed ${Object.values(serializedProofs).length} hashes.`);
    this.logger.log(`archiving proofs...`);

    this.logger.log(`archived ${Object.keys(serializedProofs).length} proofs.`);

    return serializedProofs;
  }
}
