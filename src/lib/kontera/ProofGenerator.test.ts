import { NoopContract } from "../tezos/contract/NoopContract";
import { TezosClient } from "../tezos/TezosClient";
import { ProofGenerator } from "./ProofGenerator";

const fs = require('fs')

describe('HighProof', () => {

  const tezosTestKey = {
    pkh: 'tz1KozcMMfwv7nXc2wvg9b3dbhfkak1mBbdd',
    mnemonic: ['rather', 'initial', 'dizzy', 'fold', 'record', 'crack', 'urge', 'among', 'door', 'vehicle', 'item', 'swim', 'menu', 'phone', 'wash'],
    email: 'brsnsiye.hjyprvgy@teztnets.xyz',
    password: 'X3Ip5EW5PV',
    amount: '4389885490',
    activation_code: '151ad175c146379263555aed39ee34f096cd2527'
  };

  const fileHash = 'eaf54ba2d3b9564007cbc314d305e4a0c690bdeb28276445cb58f54be79cd6c4'
  const rootHash = '6762af05125f90f2bcdec1ed167ecfb6ddcbf7af87df0c367638a4503f646006'
  const operationHash = 'oozRU4ktAyHVTtfArwv3ravcAAMFmEQp64oscVdsFmEtbBpwP5D'

  const block = JSON.parse(fs.readFileSync('./lib/kontera/blockResponse.json', 'utf8'))

  let tezosClient!: TezosClient
  let tezosContract!: NoopContract

  beforeAll(async () => {
    tezosClient = new TezosClient()
    tezosContract = new NoopContract('KT1FzuCxZqCMNYW9rGEHMpHdRsrjZ7eqFS3U', tezosClient.toolkit)
    
    await tezosContract.init()
  })


  test('buildOpGroupProof', async () => {
    const opGroupProof = JSON.parse(fs.readFileSync('./lib/kontera/opGroupProof.json', 'utf8'))
    const proofGeneratorProof = await ProofGenerator.buildOpGroupProof(block, operationHash, Buffer.from(rootHash, 'hex'))
    expect(proofGeneratorProof.toJSON()).toEqual(opGroupProof)

  })

  test('buildOpsHashProof', async () => {
    const opsHashProof = JSON.parse(fs.readFileSync('./lib/kontera/opsHashProof.json', 'utf8'))
    const proofGeneratorProof = await ProofGenerator.buildOpsHashProof(block, operationHash)

    expect(proofGeneratorProof.toJSON()).toEqual(opsHashProof)
  })

  test('buildBlockHashProof', async () => {
    const blockHashProof = JSON.parse(fs.readFileSync('./lib/kontera/blockHashProof.json', 'utf8'))
    const proofGeneratorProof = await ProofGenerator.buildBlockHeaderProof(block)

    expect(proofGeneratorProof.toJSON()).toEqual(blockHashProof)
  })

  test('buildFullProof', async () => {
    /*
    const blockHashProof = JSON.parse(fs.readFileSync('./lib/kontera/blockHashProof.json', 'utf8'))
    const proofGenerator = new ProofGenerator(tezosContract.getContract(), tezosClient.toolkit)
    const proofGeneratorProof = await proofGenerator.buildProof(block)

    expect(proofGeneratorProof.toJSON()).toEqual(blockHashProof)
    */
  })

})