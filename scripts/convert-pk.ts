require('dotenv').config('../');

import { b58cencode, prefix, Prefix } from '@taquito/utils';

const tezosPrivateKey: string | undefined = process.env.TEZOS_PRIVATE_KEY!;
const b58encodedSecret = b58cencode(tezosPrivateKey, prefix[Prefix.EDSK]);

console.log(`b58encoded: ${b58encodedSecret}`);
