import { b58cencode, prefix, Prefix } from '@taquito/utils'
import axios from 'axios'
import AbstractProof, { ProofOptions } from './Proof';

export interface TezosBlockHeaderProofOptions extends ProofOptions {
  timestamp: Date;
  network: string;
}

export interface SerializedTezosBlockHeaderProof {
  hash: string;
  operations: any[];
  version: number;
  timestamp: string;
  network: string;
}


export default class TezosBlockHeaderProof extends AbstractProof {
  public timestamp: Date;
  public network: string;

  constructor({ hash, operations, timestamp, network }: TezosBlockHeaderProofOptions) {
    super(hash, operations);
    this.timestamp = timestamp;
    this.network = network;
  }

  prependProof(proof: AbstractProof): TezosBlockHeaderProof {
    return new TezosBlockHeaderProof({
      timestamp: this.timestamp,
      network: this.network,
      hash: proof.hash,
      operations: [...proof.operations, ...this.operations]
    });
  }

  toJSON(): SerializedTezosBlockHeaderProof {
    const json = super.toJSON();
    return {
      network: this.network,
      timestamp: this.timestamp.toISOString(),
      ...json
    };
  }

  get blockHeaderHash(): string  {
    return b58cencode(this.derivation, prefix[Prefix.B]);
  }

  async verify(rpcUrl: string): Promise<boolean> {
    const blockHash = this.operations.reduce<Uint8Array>((previousHash, currentOperation) => {
      return currentOperation.commit(previousHash);
    }, this.hash);

    const b58cEncodedBlockHash = b58cencode(blockHash,  prefix[Prefix.B])

    const { data: blockData } = await axios.get(`${rpcUrl}/chains/${this.network}/blocks/${b58cEncodedBlockHash}/header`)

    if (new Date(blockData.timestamp).getTime() !== new Date(this.timestamp).getTime()) {
      throw new Error('timestamp mismatch')
    }

    return true
  }

}
