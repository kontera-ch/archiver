
export interface OperationTemplate extends Record<string, any> {
    type: 'blake2b' | 'sha256' | 'join'
}

export abstract class Operation {
    abstract commit(input: Uint8Array): Uint8Array;
    abstract toJSON(): OperationTemplate
}
