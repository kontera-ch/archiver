import { AffixedProof, AffixedProofOptions } from '@tzstamp/proof';

export interface KonteraProofOptions extends AffixedProofOptions {
    block: number
}

export class KonteraProof extends AffixedProof {
    block: number

    constructor({ block, hash, operations, network, timestamp }: KonteraProofOptions) {
        super({ hash, operations, network, timestamp })
        this.block = block
    }
}