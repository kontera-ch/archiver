import { InMemorySigner } from '@taquito/signer';
import { TezosToolkit } from '@taquito/taquito';

export class TezosClient {
  private tezosKey = {
    pkh: 'tz1KozcMMfwv7nXc2wvg9b3dbhfkak1mBbdd',
    mnemonic: ['rather', 'initial', 'dizzy', 'fold', 'record', 'crack', 'urge', 'among', 'door', 'vehicle', 'item', 'swim', 'menu', 'phone', 'wash'],
    email: 'brsnsiye.hjyprvgy@teztnets.xyz',
    password: 'X3Ip5EW5PV',
    amount: '4389885490',
    activation_code: '151ad175c146379263555aed39ee34f096cd2527'
  };

  private TEZOS_NODE = 'https://hangzhounet.api.tez.ie/';

  toolkit: TezosToolkit;

  constructor() {
    this.toolkit = new TezosToolkit(this.TEZOS_NODE);
    this.toolkit.setSignerProvider(InMemorySigner.fromFundraiser(this.tezosKey.email, this.tezosKey.password, this.tezosKey.mnemonic.join(' ')));
  }
}
