import { blake2b } from "blakejs";
import { OperationTemplate } from "../Operation";


export interface Sha256OperationOptions {
    length?: number;
    key?: Uint8Array;
}

export class Sha256Operation {
    readonly key?: Uint8Array;
    readonly length?: number;

    constructor(sha256Operation: Sha256OperationOptions) {
        this.key = sha256Operation?.key;
        this.length = sha256Operation?.length;
    }

    commit(input: Uint8Array): Uint8Array {
        return blake2b(input, this.key, this.length);
    }

    toJSON(): OperationTemplate {
        return {
            type: 'sha256',
        };
    }
}
