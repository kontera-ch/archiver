import { blake2b } from "blakejs";
import { OperationTemplate } from "../Operation";


export interface Blake2bOperationOptions {
    length?: number;
    key?: Uint8Array;
}

export class Blake2bOperation {
    readonly key?: Uint8Array;
    readonly length?: number;

    constructor(blake2bOperationOptions?: Blake2bOperationOptions) {
        this.key = blake2bOperationOptions?.key || undefined;
        this.length = blake2bOperationOptions?.length || 32;
    }

    commit(input: Uint8Array): Uint8Array {
        return blake2b(input, this.key, this.length);
    }

    toJSON(): OperationTemplate {
        return {
            type: 'blake2b',
        };
    }
}
