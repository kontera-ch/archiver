import { Operation } from "./operations/Operation";
import { SerializedProof } from "./SerializedProof";


export interface ProofOptions {

}

export default abstract class AbstractProof {

    operations: Operation[]
    hash: Uint8Array

    constructor(hash: Uint8Array, operations: Operation[]) {
        this.hash = hash
        this.operations = operations
    }

    abstract prependProof(proof: AbstractProof): AbstractProof

    get derivative() {
        return this.operations.reduce((hash, operation) => operation.commit(hash), this.hash)
    }

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
        return new Proof({ hash: this.hash, operations: [...proof.operations, ...this.operations] })
    }
}