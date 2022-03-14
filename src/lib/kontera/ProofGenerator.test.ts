import { NoopContract } from '../tezos/contract/NoopContract';
import { TezosClient } from '../tezos/TezosClient';
import { ProofGenerator } from './ProofGenerator';

const fs = require('fs');

describe('ProofGenerator', () => {
  const fileHash = 'eaf54ba2d3b9564007cbc314d305e4a0c690bdeb28276445cb58f54be79cd6c4';
  const rootHash = '6762af05125f90f2bcdec1ed167ecfb6ddcbf7af87df0c367638a4503f646006';
  const operationHash = 'oozRU4ktAyHVTtfArwv3ravcAAMFmEQp64oscVdsFmEtbBpwP5D';

  const block = JSON.parse(fs.readFileSync('./testing/data/blockResponse.json', 'utf8'));

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
    const opGroupProof = JSON.parse(fs.readFileSync('./testing/data/opGroupProof.json', 'utf8'));
    const proofGeneratorProof = await ProofGenerator.buildOpGroupProof(block, operationHash, Buffer.from(rootHash, 'hex'));
    expect(proofGeneratorProof.toJSON()).toEqual(opGroupProof);
  });

  test('buildOpsHashProof', async () => {
    const opsHashProof = JSON.parse(fs.readFileSync('./testing/data/opsHashProof.json', 'utf8'));
    const proofGeneratorProof = await ProofGenerator.buildOpsHashProof(block, operationHash);
    expect(proofGeneratorProof.toJSON()).toEqual(opsHashProof);
  });

  test('buildBlockHashProof', async () => {
    const blockHashProof = JSON.parse(fs.readFileSync('./testing/data/blockHashProof.json', 'utf8'));
    const proofGeneratorProof = await ProofGenerator.buildBlockHeaderProof(block);
    expect(proofGeneratorProof.toJSON()).toEqual(blockHashProof);
  });

  test('verify', async () => {
    const proof = await ProofGenerator.buildOpGroupProof(block, operationHash, Buffer.from(rootHash, 'hex'));
    const proof2 = await ProofGenerator.buildOpsHashProof(block, operationHash);
    const proofGeneratorProof = await ProofGenerator.buildBlockHeaderProof(block);

    const combinedProof = proofGeneratorProof.prependProof(proof2.prependProof(proof));
    const verification = await combinedProof.verify(`https://rpc.tzkt.io/hangzhou2net`)

    expect(verification).toEqual(true)
  });
});
