import { MerkleTree } from '@tzstamp/tezos-merkle';
import { ContractAbstraction, ContractProvider, TezosToolkit } from '@taquito/taquito';
import { ProofGenerator } from '../kontera/ProofGenerator';
import { Blake2bOperation } from '@/lib/kontera/proof/operations/types/Blake2bOperation';
import { Operation } from '@/lib/kontera/proof/operations/Operation';
import { JoinOperation } from '@/lib/kontera/proof/operations/types/JoinOperation';
import { Proof } from '@/lib/kontera/proof/Proof';
import { SerializedTezosBlockHeaderProof } from '../kontera/proof/TezosBlockHeaderProof';

const noOpLogger = (_msg: string): void => {
  // no-op
}
export class TezosSigner {
  constructor(private contract: ContractAbstraction<ContractProvider>, private tezosToolkit: TezosToolkit, private logger: { log: (msg: string) => void } = { log: noOpLogger }) {
    //
  }

  private digest(hashesToInclude: Set<string>): { hashes: string[]; merkleTree: MerkleTree } {
    const hashes = [...hashesToInclude.values()];
    const merkleTree = new MerkleTree();

    hashes.forEach((data) => merkleTree.append(new Uint8Array(Buffer.from(data))));

    return { hashes, merkleTree };
  }

  async commit(hashesToInclude: Set<string>): Promise<{ [x: string]: SerializedTezosBlockHeaderProof } | null> {
    const { hashes, merkleTree } = this.digest(hashesToInclude);

    const rootHash = merkleTree.root;

    if (hashes.length === 0) {
      this.logger.log('skipping this commit, no hashes.');
      return null;
    }

    const rootHashHex = Buffer.from(rootHash).toString('hex');
    this.logger.log(`Digested Hash of MerkleTree: ${rootHashHex}`);

    const opGroup = await this.contract.methods.default(rootHashHex).send();
    this.logger.log(`Sent to contract ${this.contract.address}, operation hash ${opGroup.hash}. Waiting for confirmation...`);

    const level = (await opGroup.confirmation(3) - 2);
    this.logger.log(`Confirmation with 3 blocks achieved, fetching block ${level}`);

    const block = await this.tezosToolkit.rpc.getBlock({ block: String(level) }); // 2 blocks before 3rd confirmation
    this.logger.log(`Got block ${level}, created at ${block.header.timestamp}, constructing proof`);

    const opGroupProof = await ProofGenerator.buildOpGroupProof(block, opGroup.hash, Buffer.from(rootHash));
    const opHashProof = await ProofGenerator.buildOpsHashProof(block, opGroup.hash);
    const blockHeaderProof = await ProofGenerator.buildBlockHeaderProof(block);

    const tezosProof = blockHeaderProof.prependProof(opHashProof.prependProof(opGroupProof));

    const proofs: Array<[string, SerializedTezosBlockHeaderProof]> = [];

    hashes.forEach((hash, index) => {
      const path = merkleTree.path(index);
      const merkleTreeProof = ProofGenerator.merkleTreePathToProof(path, new Uint8Array(Buffer.from(hash, 'hex')))

      const fullProof = tezosProof.prependProof(merkleTreeProof);

      proofs.push([hash, fullProof.toJSON()]);
    });

    return Object.fromEntries(proofs);
  }

  merklePathToProof(hash: Buffer, merklePath: { position: 'left' | 'right'; data: Buffer }[]) {
    const operations: Operation[] = [new Blake2bOperation()];

    for (const { data, position } of merklePath) {
      operations.push(
        new JoinOperation({
          prepend: position == 'left' ? data : undefined,
          append: position == 'right' ? data : undefined
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
