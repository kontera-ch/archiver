import AbstractProof, { ProofOptions } from './Proof';

export interface TezosBlockHeaderProofOptions extends ProofOptions {
  level: number;
  timestamp: Date;
  network: string;
}

export interface SerializedTezosBlockHeaderProof {
  hash: string;
  operations: any[];
  version: number;
  timestamp: string;
  level: number;
  network: string;
}


export default class TezosBlockHeaderProof extends AbstractProof {
  public level: number;
  public timestamp: Date;
  public network: string;

  constructor({ hash, operations, level, timestamp, network }: TezosBlockHeaderProofOptions) {
    super(hash, operations);
    this.level = level;
    this.timestamp = timestamp;
    this.network = network;
  }

  prependProof(proof: AbstractProof): TezosBlockHeaderProof {
    return new TezosBlockHeaderProof({
      timestamp: this.timestamp,
      network: this.network,
      hash: this.hash,
      operations: [...proof.operations, ...this.operations],
      level: this.level
    });
  }

  toJSON(): SerializedTezosBlockHeaderProof {
    const json = super.toJSON();
    return {
      level: this.level,
      network: this.network,
      timestamp: this.timestamp.toISOString(),
      ...json
    };
  }
}
