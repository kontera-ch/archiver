import { MerkleTree } from '@tzstamp/tezos-merkle';
import { ContractAbstraction, ContractProvider, TezosToolkit } from '@taquito/taquito';
import { ProofGenerator } from '../kontera/ProofGenerator';
import { Blake2bOperation } from '@/lib/kontera/proof/operations/types/Blake2bOperation';
import { Operation } from '@/lib/kontera/proof/operations/Operation';
import { JoinOperation } from '@/lib/kontera/proof/operations/types/JoinOperation';
import { Proof } from '@/lib/kontera/proof/Proof';
import { SerializedTezosBlockHeaderProof } from '../kontera/proof/TezosBlockHeaderProof';
import * as Sentry from '@sentry/node';

const noOpLogger = (_msg: string): void => {
  // no-op
};

export interface TezosSignerConfiguration {
  requiredConfirmations: number;
  pollingIntervalDurationSeconds: number;
}
export class TezosSigner {
  constructor(
    private contract: ContractAbstraction<ContractProvider>,
    private tezosToolkit: TezosToolkit,
    private readonly tezosSignerConfiguration: TezosSignerConfiguration,
    private logger: { log: (msg: any) => void; warn: (msg: any) => void } = { log: noOpLogger, warn: noOpLogger }
  ) {}

  private digest(hashesToInclude: Set<Uint8Array>): { hashes: Uint8Array[]; merkleTree: MerkleTree } {
    const hashes = [...hashesToInclude.values()];
    const merkleTree = new MerkleTree();

    hashes.forEach((data) => merkleTree.append(new Uint8Array(data)));

    return { hashes, merkleTree };
  }

  async commit(hashesToInclude: Set<Uint8Array>): Promise<{ [x: string]: SerializedTezosBlockHeaderProof } | null> {
    const { hashes, merkleTree } = this.digest(hashesToInclude);

    const rootHash = merkleTree.root;

    if (hashes.length === 0) {
      this.logger.log('skipping this commit, no hashes.');
      return null;
    }

    const rootHashHex = Buffer.from(rootHash).toString('hex');
    this.logger.log(`digested Hash of MerkleTree: ${rootHashHex}`);

    const preCommitBlock = await this.tezosToolkit.rpc.getBlock({ block: 'head' });

    const opGroup = await this.contract.methods.default(rootHashHex).send();

    this.logger.log(`sent to contract ${this.contract.address}, operation hash ${opGroup.hash}. Waiting for confirmation...`);

    const firstCheckedBlock = preCommitBlock.header.level;
    let operationIncludedInBlock: number;
    let lastCheckedBlock = firstCheckedBlock;

    this.logger.log(`starting inclusion check from block #${firstCheckedBlock + 1}...`);

    const maxBlocksToCheck = 50; // check next 50 blocks max
    const requiredConfirmations = this.tezosSignerConfiguration.requiredConfirmations;
    const intervalDuration = this.tezosSignerConfiguration.pollingIntervalDurationSeconds * 1000;

    // wait for at least 3 blocks
    const level = await new Promise(async (resolve, reject) => {
      const checkFct = async () => {
        try {
          if (!operationIncludedInBlock) {
            const currentBlock = await this.tezosToolkit.rpc.getBlock({ block: String(lastCheckedBlock + 1) });
            lastCheckedBlock = currentBlock.header.level;

            this.logger.log(`checking block #${currentBlock.header.level} for inclusion... (Blocks left ${firstCheckedBlock + maxBlocksToCheck - lastCheckedBlock})`);

            for (let i = 3; i >= 0; i--) {
              currentBlock.operations[i].forEach((op) => {
                if (op.hash === opGroup.hash) {
                  operationIncludedInBlock = currentBlock.header.level;
                  this.logger.log(`operation ${opGroup.hash} included in block #${operationIncludedInBlock}`);
                }
              });
            }

            if (!operationIncludedInBlock) {
              this.logger.log(`operation ${opGroup.hash} not yet included`);
            }
          } else {
            const currentBlock = await this.tezosToolkit.rpc.getBlockHeader({ block: String(lastCheckedBlock + 1) });
            lastCheckedBlock = currentBlock.level;

            if (currentBlock.level - operationIncludedInBlock >= requiredConfirmations) {
              this.logger.log(`confirmations: ${currentBlock.level - operationIncludedInBlock}/${requiredConfirmations} reached at #${currentBlock.level}`);
              clearInterval(blockInterval);
              resolve(operationIncludedInBlock);
            } else {
              this.logger.log(
                `confirmations: ${currentBlock.level - operationIncludedInBlock}/${requiredConfirmations}`
              );

              if (lastCheckedBlock - firstCheckedBlock > maxBlocksToCheck) {
                reject('max blocks for inclusion-check exceeded');
              }
            }
          }
        } catch (error) {
          if (String(error).includes('Http error response: (404)')) {
            this.logger.log('checked block does not exist yet');
          } else {
            // sth went wrong when fetching the block, but lets just keep polling
            this.logger.warn(String(error));
            Sentry.captureException(error);
          }
        }
      };

      // execute once
      await checkFct();

      const blockInterval = setInterval(checkFct, intervalDuration);
    });

    this.logger.log(`confirmation with 3 blocks achieved, fetching block ${level}`);

    const block = await this.tezosToolkit.rpc.getBlock({ block: String(level) }); // 2 blocks before 3rd confirmation
    this.logger.log(`got block ${level}, created at ${block.header.timestamp}, constructing proof`);

    Sentry.addBreadcrumb({
      category: 'proof-generation',
      message: 'block-response',
      data: {
        level: String(level),
        block: JSON.stringify(block)
      }
    });

    const opGroupProof = await ProofGenerator.buildOpGroupProof(block, opGroup.hash, Buffer.from(rootHash));

    Sentry.addBreadcrumb({
      category: 'proof-generation',
      message: 'op-group-proof',
      data: {
        opGroupProof: opGroupProof.toJSON()
      }
    });

    const opHashProof = await ProofGenerator.buildOpsHashProof(block, opGroup.hash);

    Sentry.addBreadcrumb({
      category: 'proof-generation',
      message: 'op-group-proof',
      data: {
        opHashProof: opHashProof.toJSON()
      }
    });

    const blockHeaderProof = await ProofGenerator.buildBlockHeaderProof(block);

    Sentry.addBreadcrumb({
      category: 'proof-generation',
      message: 'block-header-proof',
      data: {
        blockHeaderProof: blockHeaderProof.toJSON()
      }
    });

    const tezosProof = blockHeaderProof.prependProof(opHashProof.prependProof(opGroupProof));

    const proofs: Array<[string, SerializedTezosBlockHeaderProof]> = [];

    await Promise.all(
      hashes.map(async (hash, index) => {
        const path = merkleTree.path(index);
        const merkleTreeProof = ProofGenerator.merkleTreePathToProof(path, hash);

        const fullProof = tezosProof.prependProof(merkleTreeProof);

        proofs.push([Buffer.from(hash).toString('hex'), fullProof.toJSON()]);
      })
    );

    return Object.fromEntries(proofs);
  }

  merklePathToProof(hash: Buffer, merklePath: { position: 'left' | 'right'; data: Buffer }[]) {
    const operations: Operation[] = [new Blake2bOperation()];

    for (const { data, position } of merklePath) {
      operations.push(
        new JoinOperation({
          prepend: position === 'left' ? data : undefined,
          append: position === 'right' ? data : undefined
        }),
        new Blake2bOperation()
      );
    }

    return new Proof({
      hash,
      operations
    });
  }
}
