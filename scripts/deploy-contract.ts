require('dotenv').config('../');

import { TezosClient } from '../src/lib/tezos/TezosClient';
import { NoopContract } from '../src/lib/tezos/contract/NoopContract';
import fs from 'fs';
import { Parser } from '@taquito/michel-codec';

(async () => {
  if (!process.env.TEZOS_RPC_NODE) {
    throw new Error('TEZOS_RPC_NODE is undefined');
  }

  const tezosClient = new TezosClient(process.env.TEZOS_RPC_NODE);
  console.log(`RPC Node: ${tezosClient.toolkit.rpc.getRpcUrl()}`);

  const tezosFaucetKey: string | undefined = process.env.TEZOS_FAUCET_KEY;
  const tezosPrivateKey: string | undefined = process.env.TEZOS_PRIVATE_KEY;

  if (tezosFaucetKey) {
    console.log('setup signer using faucet key');
    await tezosClient.setupSignerUsingFaucetKey(JSON.parse(tezosFaucetKey));
  } else if (tezosPrivateKey) {
    await tezosClient.setupSignerUsingPrivateKey(tezosPrivateKey);
  }

  const contractFile = fs.readFileSync('./scripts/contract/noop.tz', { encoding: 'utf8' });
  console.log('read contract.');

  const parsedContract = new Parser().parseScript(contractFile);
  console.log('parsed contract.');

  const deployedContract = await NoopContract.deploy(tezosClient.toolkit, parsedContract!);
  console.log(`Deployed Contract at ${deployedContract.address}`);
})();
