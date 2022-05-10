import { RpcClient } from '@taquito/rpc';
import { KonteraHttpBackend } from './KonteraHttpBackend';

export class KonteraRpcClient extends RpcClient {
  constructor(url: string) {
    super(url, undefined, new KonteraHttpBackend({ 'Origin': 'kontera.ch' }))
  }
}