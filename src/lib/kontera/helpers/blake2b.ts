import { blake2b as originalBlake2b, blake2bHex as originalBlake2bHex } from 'blakejs';

const blake2bHex = (str: string) => {
  return originalBlake2bHex(str, undefined, 32);
};

const blake2b = (str: string | Uint8Array) => {
  return originalBlake2b(str, undefined, 32);
};

export { blake2b, blake2bHex };
