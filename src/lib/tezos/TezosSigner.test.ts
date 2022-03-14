import { ContractAbstraction, ContractProvider, TezosToolkit } from '@taquito/taquito';
import { NoopContract } from '../tezos/contract/NoopContract';
import { TezosClient } from '../tezos/TezosClient';
import { TezosSigner } from './TezosSigner';

const fs = require('fs');

describe('TezosSigner', () => {
  const fileHash = 'eaf54ba2d3b9564007cbc314d305e4a0c690bdeb28276445cb58f54be79cd6c4';
  const operationHash = 'oozRU4ktAyHVTtfArwv3ravcAAMFmEQp64oscVdsFmEtbBpwP5D';
  const rootHash = '6762af05125f90f2bcdec1ed167ecfb6ddcbf7af87df0c367638a4503f646006';

  const block = JSON.parse(fs.readFileSync('./testing/data/blockResponse.json', 'utf8'));

  let tezosClient!: TezosClient;
  let tezosContract!: NoopContract;
  let tezosSigner!: TezosSigner

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
    const serializedProofs = (await tezosSigner.commit(new Set([fileHash])))!

    expect(serializedProofs).toBeDefined()
    expect(serializedProofs[fileHash]).toBeDefined()
  });

  
});
