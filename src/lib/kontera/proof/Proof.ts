import { Operation } from "./operations/Operation";
import { SerializedProof } from "./SerializedProof";
export default abstract class AbstractProof {

    operations: Operation[]
    hash: Uint8Array
    derivation: Uint8Array

    constructor(hash: Uint8Array, operations: Operation[]) {
        this.hash = hash
        this.operations = operations
        this.derivation = this.operations.reduce((hash, operation) => operation.commit(hash), this.hash)
    }

    abstract prependProof(proof: AbstractProof): AbstractProof

    toJSON(): SerializedProof {
        return {
            version: 1,
            hash: Buffer.from(this.hash).toString('hex'),
            operations: this.operations.map(operation => operation.toJSON())
        }
    }

}
export interface  ProofOptions {
    hash: Uint8Array
    operations: Operation[]
}

export class Proof extends AbstractProof {
    constructor({ hash, operations }: ProofOptions) {
        super(hash, operations)
    }

    prependProof(proof: AbstractProof): Proof {
        if (Buffer.from(proof.derivation).toString('hex') !== Buffer.from(this.hash).toString('hex')) {
            throw new Error('incompatible proof extension')
        }

        return new Proof({ hash: proof.hash, operations: [...proof.operations, ...this.operations] })
    }
}