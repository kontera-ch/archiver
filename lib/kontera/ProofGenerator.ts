import { TezosProtocol } from 'airgap-coin-lib';
import { blake2b, blake2bHex } from 'blakejs';
import { ContractAbstraction, ContractProvider, TezosToolkit } from '@taquito/taquito';
import { BlockResponse, OperationContents, OperationContentsAndResult, OperationContentsAndResultReveal, OperationContentsAndResultTransaction } from '@taquito/rpc';
import { localForger } from '@taquito/local-forging';
import bs58check from 'bs58check';
import { AffixedProof, Blake2bOperation, JoinOperation, Proof } from '@tzstamp/proof';
import { MerkleTree } from "@tzstamp/tezos-merkle";
import { encodeVariable } from './helpers/encodeVariable'
import { hexParse } from './helpers/hexParse'

const blake2bHashFunction = (input: string) => blake2bHex(input, undefined, 32);

export class ProofGenerator {
  tezosProtocol: TezosProtocol;
  hashesToInclude = new Set<string>();

  constructor(private contract: ContractAbstraction<ContractProvider>, private tezosToolkit: TezosToolkit, private logger: { log: (msg: string) => void } = { log: console.log }) {
    this.tezosProtocol = new TezosProtocol();
  }

  stamp(hash: string) {
    this.hashesToInclude.add(hash);
    this.logger.log(`added ${hash} to hashes. ${this.hashesToInclude.size} pending.`);
  }

  private digest(): { hashes: string[]; merkleTree: MerkleTree } {
    const hashes = [...this.hashesToInclude.values()];
    const merkleTree = new MerkleTree();

    this.hashesToInclude.clear();

    hashes.forEach((data) => merkleTree.append(Buffer.from(data)));

    return { hashes, merkleTree };
  }

  async commit() {
    const { hashes, merkleTree } = this.digest();

    const rootHash = Buffer.from(merkleTree.root);

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

    this.buildOpGroupProof(block, opGroup.hash, rootHash);
  }

  async buildOpGroupProof(block: BlockResponse, opHash: string, root: Buffer) {
    const operations = block.operations;
    const operationEntry = operations[3].find((o) => o.hash === opHash);

    if (!operationEntry) {
      throw new Error('operation not found in target-block');
    }

    const [revealOp, transactionOp] = this.seperateOperationContant(operationEntry.contents)

    // operation proof
    const prepend = Uint8Array.from(
      Buffer.from(
        await localForger.forge({
          branch: operationEntry.branch,
          contents: revealOp ? [revealOp, transactionOp] : [transactionOp]
        }),
        'hex'
      )
    );

    // now comes a hacky part - remove the actual root hash from the binary, as it will get inserted automatically again when we sandwich it with prepend/append
    const rootHashIndex = Buffer.from(prepend).toString('hex').indexOf(Buffer.from(root).toString('hex'))
    const finalPrepend = new Uint8Array(Buffer.from(Buffer.from(prepend).toString('hex').slice(0, rootHashIndex), 'hex'))

    if (!operationEntry.signature) {
      throw new Error('signature missing from operation');
    }

    const append = bs58check.decode(operationEntry.signature).slice(3);

    const opGroupProof = new Proof({
      hash: root,
      operations: [new JoinOperation({ prepend: finalPrepend, append }), new Blake2bOperation()]
    });

    return opGroupProof;
  }

  async buildOpsHashProof(block: BlockResponse, opHash: string) {
    const passTrees = await this.buildPassTrees(block);
    const fourthPassProof = await this.buildFourthPassProof(passTrees[3], opHash);
    const multipassTree = new MerkleTree();
    
    for (const passTree of passTrees) {
      multipassTree.append(passTree.root || blake2b(new Uint8Array()));
    }

    const multipassProof = multipassTree.path(3).toProof();

    return fourthPassProof.concat(multipassProof);

  } 

  async buildFourthPassProof(passTree: MerkleTree, opHash: string) {
    const rawOpHash = bs58check.decode(opHash).slice(2).toString('hex');
    const allPaths = Array.from(passTree.paths())
    const opPath: any = allPaths.find(path => Buffer.from(path.block).toString('hex')  === rawOpHash);

    if (!opPath) {
      throw new Error('Target operation group not found in fourth pass');
    }

    return opPath.toProof() as Proof;
  }

  async buildBlockHashProof(block: BlockResponse) {
    const network = block.chain_id
    const timestamp = new Date(block.header.timestamp)

    // level
    const blockLevel = new Uint8Array(Buffer.from(block.header.level.toString(16).padStart(8, '0'), 'hex'))

    // proto
    const proto = new Uint8Array([block.header.proto])

    // predecessor
    const predecessor = new Uint8Array(bs58check.decode(block.header.predecessor).slice(2))

    // timestamp
    const unixtimestamp = new Uint8Array(Buffer.from(Math.floor(timestamp.getTime() / 1000).toString(16).padStart(16, '0'), 'hex'))

    // validation pass
    const validationPass = new Uint8Array([block.header.validation_pass])

    // construct prepend

    const prepend = new Uint8Array([...blockLevel, ...proto, ...predecessor, ...unixtimestamp, ...validationPass]) 

    // fitness
    const fitness = new Uint8Array(encodeVariable(Buffer.concat(block.header.fitness.map(hexParse).map(encodeVariable))))

    // context
    const context = new Uint8Array(bs58check.decode(block.header.context).slice(2))

    // priority
    const priority = new Uint8Array(hexParse(block.header.priority.toString(16).padStart(4, '0')))

    // proof_of_work_nonce
    const proof_of_work_nonce = new Uint8Array(hexParse(block.header.proof_of_work_nonce))

    // liquidity_baking_escape_vote
    const liquidity_baking_escape_vote = new Uint8Array([0]) // we can safely set this to false, as we are post grenada protocol

    // seed_nonce_hash
    const seed_nonce_hash = new Uint8Array([0])

    // signature
    const signature = new Uint8Array(bs58check.decode(block.header.signature).slice(3))

    // construct append
    const append = new Uint8Array([...fitness, ...context, ...priority, ...proof_of_work_nonce, ...liquidity_baking_escape_vote, ...seed_nonce_hash, ...signature])

    // hash
    const hash = new Uint8Array(bs58check.decode(block.header.operations_hash).slice(3))

    return new AffixedProof({
      hash,
      operations: [new JoinOperation({ append, prepend }), new Blake2bOperation()],
      network,
      timestamp
    });

  }

  async buildPassTrees(block: BlockResponse): Promise<MerkleTree[]> {
     const operationPassTrees = []

     for (const operation of block.operations) {
       const merkleTree = new MerkleTree();
       for (const operationEntry of operation) {
        merkleTree.append(new Uint8Array(bs58check.decode(operationEntry.hash).slice(2)));
       }
       operationPassTrees.push(merkleTree);
     }

     return operationPassTrees
  }

  seperateOperationContant(contents: (OperationContents | OperationContentsAndResult)[]): [revealOpreation: OperationContentsAndResultReveal | undefined, transactionOperation: OperationContentsAndResultTransaction] {
    if (contents.length == 1) {
      return [undefined, contents[0] as OperationContentsAndResultTransaction];
    } else if (contents.length == 2) {
      return contents as [OperationContentsAndResultReveal, OperationContentsAndResultTransaction];
    } else {
      throw new Error('OperationGroup.contents should contain either 1 or 2 operations');
    }
  }
}
