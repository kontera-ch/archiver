import { hexParse } from './hexParse';

const encodeVariable = (bytes: Buffer) => {
  const size = hexParse(bytes.length.toString(16).padStart(8, '0'));
  return Buffer.concat([size, bytes]);
};

export { encodeVariable };
