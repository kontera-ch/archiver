import { NoopContract } from '../tezos/contract/NoopContract';
import { TezosClient } from '../tezos/TezosClient';
import { ProofGenerator } from './ProofGenerator';

const fs = require('fs');

describe.skip('ProofGenerator - PtHangz2', () => {
  const rootHash = '6762af05125f90f2bcdec1ed167ecfb6ddcbf7af87df0c367638a4503f646006';
  const operationHash = 'oozRU4ktAyHVTtfArwv3ravcAAMFmEQp64oscVdsFmEtbBpwP5D';

  const block = JSON.parse(fs.readFileSync('./testing/data/PtHangz2/block-603978.json', 'utf8'));

  let tezosClient!: TezosClient;
  let tezosContract!: NoopContract;

  beforeAll(async () => {
    tezosClient = new TezosClient('https://rpc.tzkt.io/hangzhou2net');
    tezosContract = new NoopContract('KT1FzuCxZqCMNYW9rGEHMpHdRsrjZ7eqFS3U', tezosClient.toolkit);
    await tezosContract.init();
  });

  test('prependProof', async () => {
    const proof = await ProofGenerator.buildOpGroupProof(block, operationHash, Buffer.from(rootHash, 'hex'));
    const proof2 = await ProofGenerator.buildOpsHashProof(block, operationHash);

    const combinedProof = proof2.prependProof(proof);

    expect(combinedProof.operations.length).toEqual(proof.operations.length + proof2.operations.length);
    expect(combinedProof.operations.map((o) => o.toJSON())).toEqual([...proof.operations.map((o) => o.toJSON()), ...proof2.operations.map((o) => o.toJSON())]);
    expect(combinedProof.hash).toEqual(proof.hash);
    expect(combinedProof.derivation).toEqual(proof2.derivation);
  });

  test('buildOpGroupProof', async () => {
    const opGroupProof = JSON.parse(fs.readFileSync('./testing/data/PtHangz2/opGroupProof.json', 'utf8'));
    const proofGeneratorProof = await ProofGenerator.buildOpGroupProof(block, operationHash, Buffer.from(rootHash, 'hex'));
    expect(proofGeneratorProof.toJSON()).toEqual(opGroupProof);
  });

  test('buildOpsHashProof', async () => {
    const opsHashProof = JSON.parse(fs.readFileSync('./testing/data/PtHangz2/opsHashProof.json', 'utf8'));
    const proofGeneratorProof = await ProofGenerator.buildOpsHashProof(block, operationHash);
    expect(proofGeneratorProof.toJSON()).toEqual(opsHashProof);
  });

  test('blockHeaderProof', async () => {
    const blockHashProof = JSON.parse(fs.readFileSync('./testing/data/PtHangz2/blockHeaderProof.json', 'utf8'));
    const proofGeneratorProof = await ProofGenerator.buildBlockHeaderProof(block);
    expect(proofGeneratorProof.toJSON()).toEqual(blockHashProof);
  });
});


describe('ProofGenerator - Psithaca2', () => {
  const rootHash = '0f31d8f04d428642c3d1fc034b8545a108d4e983a9170c95a8228e9270cb8f38';
  const operationHash = 'op1u7sN5pF34U3jSmFwbSLmC2C9uWFYXVxnXAPGfwe5UHxw5Ywz';

  const block = JSON.parse(fs.readFileSync('./testing/data/Psithaca2/block-273213.json', 'utf8'));

  let tezosClient!: TezosClient;
  let tezosContract!: NoopContract;

  beforeAll(async () => {
    tezosClient = new TezosClient('https://rpc.tzkt.io/ithacanet');
    tezosContract = new NoopContract('KT1P8aqeq8npgMScaRk5214mCSKwhbnwRY2e', tezosClient.toolkit);
    await tezosContract.init();
  });

  test('prependProof', async () => {
    const proof = await ProofGenerator.buildOpGroupProof(block, operationHash, Buffer.from(rootHash, 'hex'));
    const proof2 = await ProofGenerator.buildOpsHashProof(block, operationHash);

    const combinedProof = proof2.prependProof(proof);

    expect(combinedProof.operations.length).toEqual(proof.operations.length + proof2.operations.length);
    expect(combinedProof.operations.map((o) => o.toJSON())).toEqual([...proof.operations.map((o) => o.toJSON()), ...proof2.operations.map((o) => o.toJSON())]);
    expect(combinedProof.hash).toEqual(proof.hash);
    expect(combinedProof.derivation).toEqual(proof2.derivation);
  });

  test('buildOpGroupProof', async () => {
    const opGroupProof = JSON.parse(fs.readFileSync('./testing/data/Psithaca2/opGroupProof.json', 'utf8'));
    const proofGeneratorProof = await ProofGenerator.buildOpGroupProof(block, operationHash, Buffer.from(rootHash, 'hex'));
    expect(proofGeneratorProof.toJSON()).toEqual(opGroupProof);
  });

  test('buildOpsHashProof', async () => {
    const opsHashProof = JSON.parse(fs.readFileSync('./testing/data/Psithaca2/opsHashProof.json', 'utf8'));
    const proofGeneratorProof = await ProofGenerator.buildOpsHashProof(block, operationHash);
    expect(proofGeneratorProof.toJSON()).toEqual(opsHashProof);
  });

  test('blockHeaderProof', async () => {
    const blockHashProof = JSON.parse(fs.readFileSync('./testing/data/Psithaca2/blockHeaderProof.json', 'utf8'));
    const proofGeneratorProof = await ProofGenerator.buildBlockHeaderProof(block);
    expect(proofGeneratorProof.toJSON()).toEqual(blockHashProof);
  });
});

describe.skip('ProofGenerator - PtJakart2', () => {
  const rootHash = '671aa6da02ccde65c0d7f1b4a44bd6d6e00c7412fbab319f66a9ef44c542d1fc';
  const operationHash = 'opN2JRqGJ4f1GsBMbGJDQwFN4c8ZksBSTheyQHy3dSLB62U4is1';

  const block = JSON.parse(fs.readFileSync('./testing/data/PtJakart2/block-2491430.json', 'utf8'));

  let tezosClient!: TezosClient;
  let tezosContract!: NoopContract;

  beforeAll(async () => {
    tezosClient = new TezosClient('https://rpc.tzkt.io/mainnet/');
    tezosContract = new NoopContract('KT1P8aqeq8npgMScaRk5214mCSKwhbnwRY2e', tezosClient.toolkit);
    await tezosContract.init();
  });

  test('prependProof', async () => {
    const proof = await ProofGenerator.buildOpGroupProof(block, operationHash, Buffer.from(rootHash, 'hex'));
    const proof2 = await ProofGenerator.buildOpsHashProof(block, operationHash);

    const combinedProof = proof2.prependProof(proof);

    expect(combinedProof.operations.length).toEqual(proof.operations.length + proof2.operations.length);
    expect(combinedProof.operations.map((o) => o.toJSON())).toEqual([...proof.operations.map((o) => o.toJSON()), ...proof2.operations.map((o) => o.toJSON())]);
    expect(combinedProof.hash).toEqual(proof.hash);
    expect(combinedProof.derivation).toEqual(proof2.derivation);
  });

  test('buildOpGroupProof', async () => {
    const opGroupProof = JSON.parse(fs.readFileSync('./testing/data/PtJakart2/opGroupProof.json', 'utf8'));
    const proofGeneratorProof = await ProofGenerator.buildOpGroupProof(block, operationHash, Buffer.from(rootHash, 'hex'));
    expect(proofGeneratorProof.toJSON()).toEqual(opGroupProof);
  });

  test('buildOpsHashProof', async () => {
    const opsHashProof = JSON.parse(fs.readFileSync('./testing/data/PtJakart2/opsHashProof.json', 'utf8'));
    const proofGeneratorProof = await ProofGenerator.buildOpsHashProof(block, operationHash);
    expect(proofGeneratorProof.toJSON()).toEqual(opsHashProof);
  });

  test('blockHeaderProof', async () => {
    const blockHashProof = JSON.parse(fs.readFileSync('./testing/data/PtJakart2/blockHeaderProof.json', 'utf8'));
    const proofGeneratorProof = await ProofGenerator.buildBlockHeaderProof(block);
    expect(proofGeneratorProof.toJSON()).toEqual(blockHashProof);
  });
});
