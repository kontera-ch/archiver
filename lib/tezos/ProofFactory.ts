/*
MIT License

Copyright (c) 2021 Marigold

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { JoinOperation, Blake2bOperation, Proof } from '@tzstamp/proof';
import { MerkleTree } from '@tzstamp/tezos-merkle';
import { Hex, Base58, Blake2b, concat, compare } from '@tzstamp/helpers';
import { encodeBranch, encodeReveal, encodeAddress, encodeZarith, encodeContractId, encodeSignature, encodeVariable, encodeArbitrary } from './Micheline';
import { KonteraProof } from './KonteraProof';

export class ProofFactory {
  static buildHighProof(block: any, opHash: any, root: Buffer): Proof {
    const opGroup = block.operations[3].find((opGroup: any) => opGroup.hash == opHash);
    if (!opGroup) {
      throw new Error('Target operation group not found in fourth validation pass of the given block');
    }

    const opGroupProof = ProofFactory.buildOpGroupProof(opGroup, root);

    const opsHashProof = ProofFactory.buildOpsHashProof(block.operations, opHash);

    const blockHashProof = ProofFactory.buildBlockHashProof(block.chain_id, block.header);

    return opGroupProof.concat(opsHashProof).concat(blockHashProof);
  }

  /**
   * Builds a proof committing the aggregator root to the operation hash.
   *
   * @param {object} opGroup Operation group data
   * @param {Uint8Array} root Aggregator root
   */
  static buildOpGroupProof(opGroup: any, root: Buffer) {
    const [revealOp, txnOp] = ProofFactory.separateOperations(opGroup.contents);
    const revealSegment = revealOp ? encodeReveal(revealOp) : new Uint8Array();
    const txnSegment = concat(
      108, // transaction tag
      encodeAddress(txnOp.source),
      encodeZarith(BigInt(txnOp.fee)),
      encodeZarith(BigInt(txnOp.counter)),
      encodeZarith(BigInt(txnOp.gas_limit)),
      encodeZarith(BigInt(txnOp.storage_limit)),
      encodeZarith(BigInt(txnOp.amount)),
      encodeContractId(txnOp.destination),
      255, // parameters flag
      0, // entrypoint "default"
      encodeVariable(
        // payload metadata
        encodeArbitrary(Hex.parse(txnOp.parameters.value.bytes))
      ).slice(0, 9)
    );
    const prepend = concat(encodeBranch(opGroup.branch), revealSegment, txnSegment);
    const append = encodeSignature(opGroup.signature);

    return new Proof({
      hash: root,
      operations: [new JoinOperation({ prepend, append }), new Blake2bOperation()]
    });
  }

  /**
   * Separates the operations in a transaction operation group.
   *
   * @param {object[]} contents
   */
  static separateOperations(contents: any) {
    if (contents.length == 1) {
      return [undefined, contents[0]];
    } else if (contents.length == 2) {
      return contents;
    } else {
      throw new RangeError('Unexpected number of operations in operation group');
    }
  }

  /**
   * Builds a proof committing the operation hash to the operations pass list hash.
   *
   * @param {object[][]} passList Operations list list
   * @param {string} opHash Operation hash
   */
  static buildOpsHashProof(passList: any, opHash: any) {
    const passTrees = ProofFactory.buildPassTrees(passList);
    const fourthPassProof = ProofFactory.buildFourthPassProof(passTrees[3], opHash);
    const multipassTree = new MerkleTree();
    for (const passTree of passTrees) {
      multipassTree.append(passTree.root || Blake2b.digest(new Uint8Array()));
    }
    const multipassProof = multipassTree.path(3).toProof();
    return fourthPassProof.concat(multipassProof);
  }

  /**
   * Builds a proof committing the operation hash to the fourth operation pass hash.
   *
   * @param {MerkleTree} passTree Fourth operation pass Merkle tree
   * @param {string} opHash Operation hash
   */
  static buildFourthPassProof(passTree: MerkleTree, opHash: string) {
    const rawOpHash = Base58.decodeCheck(opHash, new Uint8Array([5, 116]));

    const opPath: any = Array.from(passTree.paths()).find((path: any) => compare(path.block, rawOpHash));

    if (!opPath) {
      throw new Error('Target operation group not found in fourth pass');
    }

    return opPath.toProof();
  }

  /**
   * Builds a proof committing the operations hash to the block hash.
   *
   * @param {string} network Tezos network identifier
   * @param {object} header Block header data
   */
  static buildBlockHashProof(network: any, header: any) {
    const block = header.level
    const timestamp = new Date(header.timestamp);
    const prepend = concat(
      Hex.parse(
        // level
        header.level.toString(16).padStart(8, '0')
      ),
      header.proto, // proto
      Base58.decodeCheck(header.predecessor, new Uint8Array([1, 52])), // predecessor
      Hex.parse(
        // timestamp
        Math.floor(timestamp.getTime() / 1000)
          .toString(16)
          .padStart(16, '0')
      ),
      header.validation_pass // validation passes
    );
    const append = concat(
      encodeVariable(
        // fitness
        concat(...header.fitness.map(Hex.parse).map(encodeVariable))
      ),
      Base58.decodeCheck(header.context, new Uint8Array([79, 199])), // context
      Hex.parse(
        // priority
        header.priority.toString(16).padStart(4, '0')
      ),
      Hex.parse(header.proof_of_work_nonce), // proof_of_work_nonce
      header.liquidity_baking_escape_vote ? 1 : 0,
      0, // seed_nonce_hash flag
      encodeSignature(header.signature) // signature
    );
    const rawOpHash = Base58.decodeCheck(header.operations_hash, new Uint8Array([29, 159, 109]));
    
    return new KonteraProof({
      block,
      hash: rawOpHash,
      operations: [new JoinOperation({ append, prepend }), new Blake2bOperation()],
      network,
      timestamp
    });
  }

  /**
   * Builds a list of Merkle trees from a operations pass list.
   *
   * @param {object[][]} passList
   */
  static buildPassTrees(passList: any) {
    const trees = [];
    for (const pass of passList) {
      const merkleTree = new MerkleTree();
      for (const opGroup of pass) {
        merkleTree.append(Base58.decodeCheck(opGroup.hash, new Uint8Array([5, 116])));
      }
      trees.push(merkleTree);
    }
    return trees;
  }
}
