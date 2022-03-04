export interface SerializedProof {
  hash: string;
  operations: any[];
  version: number;
  timestamp?: string;
  level?: number;
  network?: string;
}
