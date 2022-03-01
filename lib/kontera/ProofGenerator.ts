import { TezosProtocol } from "airgap-coin-lib";
import { MerkleTree } from 'merkletreejs';
import { blake2bHex } from 'blakejs';
import { ContractAbstraction, ContractProvider, OperationContent, TezosToolkit } from '@taquito/taquito';
import { BlockResponse, OperationContents, OperationContentsAndResult } from "@taquito/rpc";
import { localForger, getCodec, CODEC } from '@taquito/local-forging'
import bs58check from 'bs58check'
import { Blake2bOperation, JoinOperation, Proof } from "@tzstamp/proof";

const blake2bHashFunction = (input: string) => blake2bHex(input, undefined, 32);


export class ProofGenerator {

  tezosProtocol: TezosProtocol
  hashesToInclude = new Set<string>();

  constructor(private contract: ContractAbstraction<ContractProvider>, private tezosToolkit: TezosToolkit, private logger: { log: (msg: string) => void } = { log: console.log }) {
    this.tezosProtocol = new TezosProtocol()
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

  async commit() {
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

    this.constructHighProof(block, opGroup.hash, rootHash)
    
  }

  async constructHighProof(block: BlockResponse, opHash: string, root: Buffer) {
    const operations = block.operations
    const operationEntry = operations[3].find(o => o.hash === opHash)

     if (!operationEntry) {
       throw new Error('operation not found in target-block')
     }

     // operation proof 
     const prepend = Uint8Array.from(Buffer.from(await localForger.forge({
       branch: operationEntry.branch,
       contents: operationEntry.contents
     }), 'hex'))

     if (!operationEntry.signature) {
       throw new Error('signature missing from operation')
     }

     const append = bs58check.decode(operationEntry.signature).slice(3)

     const opGroupProof = new Proof({
      hash: root,
      operations: [new JoinOperation({ prepend, append }), new Blake2bOperation()]
    });

     const operationPassTrees = []

     for (const operation in operations) {
       const merkleTree = new MerkleTree([], blake2bHashFunction, { duplicateOdd: true });
       for (const operationEntry of operations) {
         
       }
     }


  }

  seperateOperationContant(contents: (OperationContents | OperationContentsAndResult)[]): [revealOpreation?: OperationContent, transactionOperation: OperationContent] {
      if (contents.length == 1) {
        return [undefined, contents[0] as OperationContent];
      } else if (contents.length == 2) {
        return contents as [OperationContent, OperationContent];
      } else {
        throw new Error('OperationGroup.contents should contain either 1 or 2 operations');
      }
    }
  }

  

}

const forgedOperation = await protocol.forgeTezosOperation({
  branch: '',
  contents: [{
    kind: TezosOperationType.TRANSACTION
  }]
})