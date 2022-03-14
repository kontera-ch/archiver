import { ContractAbstraction, ContractProvider, TezosToolkit } from '@taquito/taquito';
import { hexParse } from '../kontera/helpers/hexParse';
import { NoopContract } from '../tezos/contract/NoopContract';
import { TezosClient } from '../tezos/TezosClient';
import { TezosSigner } from './TezosSigner';

const fs = require('fs');

describe('TezosSigner', () => {
  const fileHash = '811a61883036933a8eaeefba466429ff67164e9fbfb178ea15123bf387542018';
  const operationHash = 'opTBQU64LQTxpoba66tA9jy4YPtEyymSgWQgLLAvXHoppG4XSg3';
  const rootHash = '671aa6da02ccde65c0d7f1b4a44bd6d6e00c7412fbab319f66a9ef44c542d1fc';

  const block = JSON.parse(fs.readFileSync('./testing/data/block-669570.json', 'utf8'));

  let tezosClient!: TezosClient;
  let tezosContract!: NoopContract;
  let tezosSigner!: TezosSigner;

  let mockContract = {
    address: 'contract-address',

    methods: {
      default: jest.fn(() => ({
        send: jest.fn(() => ({
          hash: operationHash,
          confirmation: jest.fn(() => {
            return 603979
          })
        }))
      }))
    }
  } as unknown as ContractAbstraction<ContractProvider>

  let mockedToolkit = {
    rpc: {
      getBlock: jest.fn(() => block)
    }
  } as unknown as TezosToolkit

  beforeAll(async () => {
    tezosClient = new TezosClient('https://rpc.tzkt.io/hangzhou2net');
    tezosContract = new NoopContract('KT1FzuCxZqCMNYW9rGEHMpHdRsrjZ7eqFS3U', tezosClient.toolkit);
    tezosSigner = new TezosSigner(mockContract, mockedToolkit)

    await tezosContract.init();
  });

  test('commit a single hash', async () => {
    const serializedProofs = (await tezosSigner.commit(new Set([new Uint8Array(hexParse(fileHash))])))!

    expect(serializedProofs).toBeDefined()
    expect(serializedProofs[fileHash]).toBeDefined()
  });

  
});
