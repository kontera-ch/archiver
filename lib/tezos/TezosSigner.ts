import { MerkleTree } from 'merkletreejs';
import { ProofFactory } from './ProofFactory';
import { blake2bHex } from 'blakejs';
import { ContractAbstraction, ContractProvider, TezosToolkit } from '@taquito/taquito';
import { Blake2bOperation, JoinOperation, Operation, Proof, ProofTemplate } from '@tzstamp/proof';
import * as fs from 'fs'

const blake2bHashFunction = (input: string) => blake2bHex(input, undefined, 32);

export class TezosSigner {
  private hashesToInclude = new Set<string>();

  constructor(private contract: ContractAbstraction<ContractProvider>, private tezosToolkit: TezosToolkit, private logger: { log: (msg: string) => void } = { log: console.log }) {
    //
  }

  stamp(hash: string) {
    this.hashesToInclude.add(hash);
    this.logger.log(`added ${hash} to hashes. ${this.hashesToInclude.size} pending.`);
  }

  private digest(): { hashes: string[]; merkleTree: MerkleTree } {
    const hashes = [...this.hashesToInclude.values()];
    const merkleTree = new MerkleTree([], blake2bHashFunction, { duplicateOdd: true });

    this.hashesToInclude.clear();

    hashes.forEach((data) => merkleTree.addLeaf(Buffer.from(data), true));

    return { hashes, merkleTree };
  }

  async commit(): Promise<{ proof: ProofTemplate; rootHash?: string; hashes: string[] }[]> {
    const { hashes, merkleTree } = this.digest();

    const rootHash = merkleTree.getRoot();

    if (hashes.length === 0) {
      this.logger.log('skipping this commit, no hashes.');
      return [];
    }

    const rootHashHex = rootHash.toString('hex');
    this.logger.log(`Digested Hash of MerkleTree: ${rootHashHex}`);

    const opGroup = await this.contract.methods.default(rootHashHex).send();
    this.logger.log(`Sent to contract ${this.contract.address}, operation hash ${opGroup.hash}. Waiting for confirmation...`);

    const level = await opGroup.confirmation(3);
    this.logger.log(`Confirmation with 3 blocks achieved, fetching block ${level}`);

    const block = await this.tezosToolkit.rpc.getBlock({ block: String(level - 2) }); // 2 blocks before 3rd confirmation
    this.logger.log(`Got block ${level}, created at ${block.header.timestamp}, constructing proof`);

    const highProof = ProofFactory.buildHighProof(block, opGroup.hash, rootHash);

    const proofs: { proof: ProofTemplate; rootHash?: string; hashes: string[] }[] = [];

    hashes.forEach((hash, index) => {
      const path = merkleTree.getProof(blake2bHashFunction(hash)) as { position: 'left' | 'right'; data: Buffer }[];
      const lowProof = this.merklePathToProof(Buffer.from(hash), path);
      
      fs.writeFileSync('./lowProof.json', JSON.stringify(lowProof.toJSON()))

      const fullProof = lowProof.concat(highProof);

      proofs.push({ proof: fullProof.toJSON(), rootHash: rootHashHex, hashes });
    });

    return proofs;
  }

  merklePathToProof(hash: Buffer, merklePath: { position: 'left' | 'right'; data: Buffer }[]) {
    const operations: Operation[] = [new Blake2bOperation()];

    for (const { position, data } of merklePath) {
      const joinOperation = new JoinOperation({
        prepend: position == 'left' ? data : undefined,
        append: position == 'right' ? data : undefined
      });

      operations.push(joinOperation, new Blake2bOperation());
    }

    return new Proof({
      hash,
      operations
    });
  }
}
