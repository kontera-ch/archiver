import { Operation, OperationTemplate } from "../Operation";


export interface JoinOptions {
    prepend: Uint8Array | undefined;
    append: Uint8Array | undefined;
}

export class JoinOperation extends Operation {

    readonly prepend?: Uint8Array;
    readonly append?: Uint8Array;

    constructor({ prepend, append }: JoinOptions) {
        super();
        this.prepend = prepend;
        this.append = append;
    }

    commit(input: Uint8Array): Uint8Array {
        let arr = []

        if (this.prepend) {
            arr.push(...this.prepend)
        }

        arr.push(...input)

        if (this.append) {
            arr.push(...this.append)
        }

        return new Uint8Array(arr);
    }

    toJSON(): OperationTemplate {
        return {
            type: 'join',
            prepend: this.prepend ? Buffer.from(this.prepend).toString('hex') : undefined,
            append: this.append ? Buffer.from(this.append).toString('hex'): undefined
        };
    }
}
