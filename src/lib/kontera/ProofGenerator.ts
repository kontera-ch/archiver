import { BlockResponse, OperationContents, OperationContentsAndResult, OperationContentsAndResultReveal, OperationContentsAndResultTransaction } from '@taquito/rpc';
import { localForger } from '@taquito/local-forging';
import bs58check from 'bs58check';
import { MerkleTree, Path } from '@tzstamp/tezos-merkle';
import { encodeVariable } from './helpers/encodeVariable';
import { hexParse } from './helpers/hexParse';
import { Proof } from './proof/Proof';
import { Blake2bOperation } from './proof/operations/types/Blake2bOperation';
import { JoinOperation } from './proof/operations/types/JoinOperation';
import TezosBlockHeaderProof from './proof/TezosBlockHeaderProof';
import { blake2b } from './helpers/blake2b';

export class ProofGenerator {
  static async buildOpGroupProof(block: BlockResponse, opHash: string, root: Buffer) {
    const operations = block.operations;
    const operationEntry = operations[3].find((o) => o.hash === opHash);

    if (!operationEntry) {
      throw new Error('operation not found in target-block');
    }

    const [revealOp, transactionOp] = ProofGenerator.seperateOperationContant(operationEntry.contents);

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
    const rootHashIndex = Buffer.from(prepend).toString('hex').indexOf(Buffer.from(root).toString('hex'));

    if (rootHashIndex === -1) {
      throw new Error('unable to remove rootHash')
    }

    const finalPrepend = new Uint8Array(Buffer.from(Buffer.from(prepend).toString('hex').slice(0, rootHashIndex), 'hex'));

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

  static async buildOpsHashProof(block: BlockResponse, opHash: string) {
    const passTrees = await this.buildPassTrees(block);
    const fourthPassProof = await this.buildFourthPassProof(passTrees[3], opHash);
    const multipassTree = new MerkleTree();

    for (const passTree of passTrees) {
      multipassTree.append(passTree.root || blake2b(new Uint8Array()));
    }

    const multipassProof = ProofGenerator.merkleTreePathToProof(multipassTree.path(3));

    return multipassProof.prependProof(fourthPassProof);
  }

  private static merkleTreePathToProof(path: Path): Proof {
    const operations = [new Blake2bOperation()];

    for (const { hash, relation } of path.siblings) {
      operations.push(
        new JoinOperation({
          prepend: relation == 'left' ? hash : undefined,
          append: relation == 'right' ? hash : undefined
        }),
        new Blake2bOperation()
      );
    }
    return new Proof({
      hash: path.block,
      operations
    });
  }

  private static async buildFourthPassProof(passTree: MerkleTree, opHash: string) {
    const rawOpHash = bs58check.decode(opHash).slice(2).toString('hex');
    const allPaths = Array.from(passTree.paths());
    const opPath: any = allPaths.find((path) => Buffer.from(path.block).toString('hex') === rawOpHash);

    if (!opPath) {
      throw new Error('Target operation group not found in fourth pass');
    }

    return opPath.toProof() as Proof;
  }

  static async buildBlockHeaderProof(block: BlockResponse) {
    const network = block.chain_id;
    const timestamp = new Date(block.header.timestamp);
    const level = block.header.level;

    // level
    const blockLevel = new Uint8Array(Buffer.from(level.toString(16).padStart(8, '0'), 'hex'));

    // proto
    const proto = new Uint8Array([block.header.proto]);

    // predecessor
    const predecessor = new Uint8Array(bs58check.decode(block.header.predecessor).slice(2));

    // timestamp
    const unixtimestamp = new Uint8Array(
      Buffer.from(
        Math.floor(timestamp.getTime() / 1000)
          .toString(16)
          .padStart(16, '0'),
        'hex'
      )
    );

    // validation pass
    const validationPass = new Uint8Array([block.header.validation_pass]);

    // construct prepend

    const prepend = new Uint8Array([...blockLevel, ...proto, ...predecessor, ...unixtimestamp, ...validationPass]);

    // fitness
    const fitness = new Uint8Array(encodeVariable(Buffer.concat(block.header.fitness.map(hexParse).map(encodeVariable))));

    // context
    const context = new Uint8Array(bs58check.decode(block.header.context).slice(2));

    // priority
    const priority = new Uint8Array(hexParse(block.header.priority.toString(16).padStart(4, '0')));

    // proof_of_work_nonce
    const proof_of_work_nonce = new Uint8Array(hexParse(block.header.proof_of_work_nonce));

    // liquidity_baking_escape_vote
    const liquidity_baking_escape_vote = new Uint8Array([0]); // we can safely set this to false, as we are post grenada protocol

    // seed_nonce_hash
    const seed_nonce_hash = new Uint8Array([0]);

    // signature
    const signature = new Uint8Array(bs58check.decode(block.header.signature).slice(3));

    // construct append
    const append = new Uint8Array([...fitness, ...context, ...priority, ...proof_of_work_nonce, ...liquidity_baking_escape_vote, ...seed_nonce_hash, ...signature]);

    // hash
    const hash = new Uint8Array(bs58check.decode(block.header.operations_hash).slice(3));

    return new TezosBlockHeaderProof({
      hash,
      level,
      operations: [new JoinOperation({ append, prepend }), new Blake2bOperation()],
      network,
      timestamp
    });
  }

  static async buildPassTrees(block: BlockResponse): Promise<MerkleTree[]> {
    const operationPassTrees = [];

    for (const operation of block.operations) {
      const merkleTree = new MerkleTree();
      for (const operationEntry of operation) {
        merkleTree.append(new Uint8Array(bs58check.decode(operationEntry.hash).slice(2)));
      }
      operationPassTrees.push(merkleTree);
    }

    return operationPassTrees;
  }

  static seperateOperationContant(
    contents: (OperationContents | OperationContentsAndResult)[]
  ): [revealOpreation: OperationContentsAndResultReveal | undefined, transactionOperation: OperationContentsAndResultTransaction] {
    if (contents.length == 1) {
      return [undefined, contents[0] as OperationContentsAndResultTransaction];
    } else if (contents.length == 2) {
      return contents as [OperationContentsAndResultReveal, OperationContentsAndResultTransaction];
    } else {
      throw new Error('OperationGroup.contents should contain either 1 or 2 operations');
    }
  }
}
