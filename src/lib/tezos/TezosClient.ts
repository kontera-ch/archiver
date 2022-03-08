import { InMemorySigner } from '@taquito/signer';
import { TezosToolkit } from '@taquito/taquito';

export class TezosClient {
  toolkit: TezosToolkit;

  constructor(rpcNode: string) {
    this.toolkit = new TezosToolkit(rpcNode);
  }

  async setupSignerUsingPrivateKey(privateKey: string) {
    const inMemorySigner = await InMemorySigner.fromSecretKey(privateKey)
    this.toolkit.setSignerProvider(inMemorySigner)
  }

  async setupSignerUsingFaucetKey({ email, mnemonic, password }: { email: string, mnemonic: string[], password: string }) {
    const inMemorySigner = InMemorySigner.fromFundraiser(email, password, mnemonic.join(' '))
    this.toolkit.setSignerProvider(inMemorySigner)
  }
}
