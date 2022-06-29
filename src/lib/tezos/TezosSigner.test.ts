import { ContractAbstraction, ContractProvider, TezosToolkit } from '@taquito/taquito';
import { hexParse } from '../kontera/helpers/hexParse';
import { NoopContract } from '../tezos/contract/NoopContract';
import { TezosClient } from '../tezos/TezosClient';
import { TezosSigner } from './TezosSigner';

const fs = require('fs');

describe.skip('TezosSigner - PtHangz2 Protocol', () => {
  const fileHash = '811a61883036933a8eaeefba466429ff67164e9fbfb178ea15123bf387542018';
  const operationHash = 'opTBQU64LQTxpoba66tA9jy4YPtEyymSgWQgLLAvXHoppG4XSg3';

  const block = JSON.parse(fs.readFileSync('./testing/data/PtHangz2/block-669570.json', 'utf8'));

  let tezosClient!: TezosClient;
  let tezosContract!: NoopContract;
  let tezosSigner!: TezosSigner;

  let mockContract = {
    address: 'contract-address',

    methods: {
      default: jest.fn(() => ({
        send: jest.fn(() => ({
          hash: operationHash
        }))
      }))
    }
  } as unknown as ContractAbstraction<ContractProvider>

  let mockedToolkit = {
    rpc: {
      getBlock: jest.fn(() => block),
      getBlockHeader: jest.fn(() => ({
        level: 669573
      }))
    }
  } as unknown as TezosToolkit

  beforeAll(async () => {
    tezosClient = new TezosClient('https://rpc.tzkt.io/hangzhou2net');
    tezosContract = new NoopContract('KT1FzuCxZqCMNYW9rGEHMpHdRsrjZ7eqFS3U', tezosClient.toolkit);
    tezosSigner = new TezosSigner(mockContract, mockedToolkit, { pollingIntervalDurationSeconds: 1, requiredConfirmations: 3 })

    await tezosContract.init();
  });

  test('commit a single hash', async () => {
    const serializedProofs = (await tezosSigner.commit(new Set([new Uint8Array(hexParse(fileHash))])))!

    expect(serializedProofs).toBeDefined()
    expect(serializedProofs[fileHash]).toBeDefined()
  });
  
});

describe('TezosSigner - Psithaca2 Protocol', () => {
  const fileHash = '811a61883036933a8eaeefba466429ff67164e9fbfb178ea15123bf387542018';
  const operationHash = 'ontxuSXsy3x7bvN8jgNTkgbfhcsRzyXQYbZ6tzDre8BvKgZAcGt';

  const block = JSON.parse(fs.readFileSync('./testing/data/Psithaca2/block-273045.json', 'utf8'));

  let tezosClient!: TezosClient;
  let tezosContract!: NoopContract;
  let tezosSigner!: TezosSigner;

  let mockContract = {
    address: 'contract-address',

    methods: {
      default: jest.fn(() => ({
        send: jest.fn(() => ({
          hash: operationHash
        }))
      }))
    }
  } as unknown as ContractAbstraction<ContractProvider>

  let mockedToolkit = {
    rpc: {
      getBlock: jest.fn(() => block),
      getBlockHeader: jest.fn(() => ({
        level: 273048
      }))
    }
  } as unknown as TezosToolkit

  beforeAll(async () => {
    tezosClient = new TezosClient('https://rpc.tzkt.io/ithacanet');
    tezosContract = new NoopContract('KT1P8aqeq8npgMScaRk5214mCSKwhbnwRY2e', tezosClient.toolkit);
    tezosSigner = new TezosSigner(mockContract, mockedToolkit, { pollingIntervalDurationSeconds: 1, requiredConfirmations: 3 })

    await tezosContract.init();
  });

  test('commit a single hash', async () => {
    const serializedProofs = (await tezosSigner.commit(new Set([new Uint8Array(hexParse(fileHash))])))!

    expect(serializedProofs).toBeDefined()
    expect(serializedProofs[fileHash]).toBeDefined()
  });

  
});

describe.skip('TezosSigner - PtJakart2 Protocol', () => {
  const fileHash = '671aa6da02ccde65c0d7f1b4a44bd6d6e00c7412fbab319f66a9ef44c542d1fc';
  const operationHash = 'opN2JRqGJ4f1GsBMbGJDQwFN4c8ZksBSTheyQHy3dSLB62U4is1';

  const block = JSON.parse(fs.readFileSync('./testing/data/PtJakart2/block-2491430.json', 'utf8'));

  let tezosClient!: TezosClient;
  let tezosContract!: NoopContract;
  let tezosSigner!: TezosSigner;

  let mockContract = {
    address: 'contract-address',

    methods: {
      default: jest.fn(() => ({
        send: jest.fn(() => ({
          hash: operationHash
        }))
      }))
    }
  } as unknown as ContractAbstraction<ContractProvider>

  let mockedToolkit = {
    rpc: {
      getBlock: jest.fn(() => block),
      getBlockHeader: jest.fn(() => ({
        level: 2491433
      }))
    }
  } as unknown as TezosToolkit

  beforeAll(async () => {
    tezosClient = new TezosClient('https://rpc.tzkt.io/mainnet/');
    tezosContract = new NoopContract('KT1VymoTSg7dVWxPS1eFZpLcMTWafok71tSv', tezosClient.toolkit);
    tezosSigner = new TezosSigner(mockContract, mockedToolkit, { pollingIntervalDurationSeconds: 1, requiredConfirmations: 3 })

    await tezosContract.init();
  });

  test('commit a single hash', async () => {
    const serializedProofs = (await tezosSigner.commit(new Set([new Uint8Array(hexParse(fileHash))])))!

    expect(serializedProofs).toBeDefined()
    expect(serializedProofs[fileHash]).toBeDefined()
  });

  
});
