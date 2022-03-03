import { ContractAbstraction, ContractProvider, TezosToolkit } from '@taquito/taquito';

export class NoopContract {
  private contract?: ContractAbstraction<ContractProvider>;

  constructor(private address: string, private toolkit: TezosToolkit) {
    //
  }

  async init() {
    this.contract = await this.toolkit.contract.at(this.address);
    return this.contract;
  }

  getContract() {
    if (!this.contract) {
      throw new Error('call init() first to setup the contract');
    }

    return this.contract;
  }

  static async deploy(toolkit: TezosToolkit, contractFile: string) {
    const originationOp = await toolkit.contract.originate({
      code: contractFile,
      init: 'Unit'
    });

    console.log(`Waiting for confirmation of origination for ${originationOp.contractAddress}...`);

    const originatedContract = await originationOp.contract();

    console.log('Origination completed.');

    return originatedContract;
  }
}
