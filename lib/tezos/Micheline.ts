/*
MIT License

Copyright (c) 2021 Marigold

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { Base58, Hex, concat } from '@tzstamp/helpers';

/**
 * Operation Micheline encoders
 *
 * @type {Map<string, (data: object) => Uint8Array>}
 *
 * @see Refer to the Micheline schema for "008-PtEdo2Zk.operation",
 * item "008-PtEdo2Zk.operation.alpha.contents"
 *
 * `$ tezos-codec describe 008-PtEdo2Zk.operation binary schema`
 */
const operationEncoders = new Map([
  ['reveal', encodeReveal],
  ['transaction', encodeTransaction]
]);

/**
 * Micheline encode an operation group
 *
 * @param {object} operationGroup Operation group
 * @returns {Uint8Array} Operation group as Micheline binary
 *
 * @see Refer to the Micheline schema for "008-PtEdo2Zk.operation".
 *
 * `$ tezos-codec describe 008-PtEdo2Zk.operation binary schema`
 */
function encodeOperationGroup(operationGroup: any) {
  return concat(encodeBranch(operationGroup.branch), encodeContents(operationGroup.contents), encodeSignature(operationGroup.signature));
}

/**
 * Micheline encode a branch address
 *
 * @param {string} branch Block address of branch
 * @returns {Uint8Array} Branch as Micheline binary
 *
 * @see Refer to the Micheline schema for "008-PtEdo2Zk.operation".
 *
 * `$ tezos-codec describe 008-PtEdo2Zk.operation binary schema`
 */
function encodeBranch(branch: any) {
  return Base58.decodeCheck(branch).slice(2);
}

/**
 * Micheline encode a signature
 *
 * @param {string} signature Base-58 signature
 * @return {Uint8Array} Signature as Micheline binary
 *
 * @see Refer to the Micheline schema for "008-PtEdo2Zk.operation".
 *
 * `$ tezos-codec describe 008-PtEdo2Zk.operation binary schema`
 */
function encodeSignature(signature: any) {
  return Base58.decodeCheck(signature).slice(3);
}

/**
 * Micheline encode an operation group contents
 *
 * @param {object[]} contents Operation group contents
 * @returns {Uint8Array} Operation group contents as Micheline binary
 *
 * @see Refer to the Micheline schema for "008-PtEdo2Zk.operation".
 *
 * `$ tezos-codec describe 008-PtEdo2Zk.operation binary schema`
 */
function encodeContents(contents: any) {
  const operations = contents.map(encodeOperation);
  return concat(...operations);
}

/**
 * Micheline encode an operation
 *
 * @param {*} data
 * @returns {Uint8Array} Operation as Micheline binary
 *
 * @see Refer to the Micheline schema for "008-PtEdo2Zk.operation",
 * item "008-PtEdo2Zk.operation.alpha.contents"
 *
 * `$ tezos-codec describe 008-PtEdo2Zk.operation binary schema`
 */
function encodeOperation(data: any) {
  const encoder = operationEncoders.get(data.kind);
  if (encoder == undefined) {
    throw new Error(`Unsupported operation kind "${data.kind}"`);
  }
  return encoder(data);
}

/**
 * Micheline encode a reveal operation
 *
 * @param {object} data Operation data
 * @returns {Uint8Array} Reveal operation as Micheline binary
 *
 * @see Refer to the Micheline schema for "008-PtEdo2Zk.operation",
 * item "008-PtEdo2Zk.operation.alpha.contents", subheading "Reveal"
 *
 * `$ tezos-codec describe 008-PtEdo2Zk.operation binary schema`
 */
function encodeReveal(data: any) {
  return concat(
    107, // tag
    encodeAddress(data.source),
    encodeZarith(BigInt(data.fee)),
    encodeZarith(BigInt(data.counter)),
    encodeZarith(BigInt(data.gas_limit)),
    encodeZarith(BigInt(data.storage_limit)),
    encodePublicKey(data.public_key)
  );
}

/**
 * Micheline encode a transaction operation
 *
 * @param {object} data Operation data
 * @returns {Uint8Array} Transaction operation as Micheline binary
 *
 * @see Refer to the Micheline schema for "008-PtEdo2Zk.operation",
 * item "008-PtEdo2Zk.operation.alpha.contents", subheading "Transaction"
 *
 * `$ tezos-codec describe 008-PtEdo2Zk.operation binary schema`
 */
function encodeTransaction(data: any) {
  return concat(
    108, // tag
    encodeAddress(data.source),
    encodeZarith(BigInt(data.fee)),
    encodeZarith(BigInt(data.counter)),
    encodeZarith(BigInt(data.gas_limit)),
    encodeZarith(BigInt(data.storage_limit)),
    encodeZarith(BigInt(data.amount)),
    encodeContractId(data.destination),
    encodeParameters(data.parameters)
  );
}

/**
 * Public key tags
 */
const publicKeyTags = new Map([
  ['edpk', 0],
  ['spsk', 1],
  ['p2sk', 2]
]);

/**
 * Micheline encode a public key
 *
 * @param {string} publicKey Base-58 public key
 * @see Refer to the Micheline schema for "008-PtEdo2Zk.operation",
 * item "public_key"
 *
 * `$ tezos-codec describe 008-PtEdo2Zk.operation binary schema`
 */
function encodePublicKey(publicKey: any) {
  const prefix = publicKey.slice(0, 4);
  const bare = Base58.decodeCheck(publicKey).slice(4);
  const tag = publicKeyTags.get(prefix);
  if (tag == undefined) {
    throw new Error(`Unsupported public key prefix "${prefix}"`);
  }
  return concat(tag, bare);
}

/**
 * Public key hash tags
 */
const addressTags = new Map([
  ['tz1', 0],
  ['tz2', 1],
  ['tz3', 2]
]);

/**
 * Micheline encode an implicit or originated address
 *
 * @param {string} address Base-58 address
 * @see Refer to the Micheline schema for "008-PtEdo2Zk.operation",
 * item "public_key_hash"
 *
 * `$ tezos-codec describe 008-PtEdo2Zk.operation binary schema`
 */
function encodeAddress(address: any) {
  const prefix = address.slice(0, 3);
  const bare = Base58.decodeCheck(address).slice(3);
  const tag = addressTags.get(prefix);
  if (tag == undefined) {
    throw new Error(`Unsupported address prefix "${prefix}"`);
  }
  return concat(tag, bare);
}

/**
 * Micheline encode an implicit or originated address
 *
 * @param {string} address Base-58 address
 * @returns {Uint8Array} Contract ID as Micheline binary
 *
 * @see Refer to the Micheline schema for `008-PtEdo2Zk.operation`,
 * item "008-PtEdo2Zk.contract_id"
 *
 * `$ tezos-codec describe 008-PtEdo2Zk.operation binary schema`
 */
function encodeContractId(address: any) {
  const prefix = address.slice(0, 3);
  const bare = Base58.decodeCheck(address).slice(3);
  switch (prefix) {
    // Implicit
    case 'tz1':
    case 'tz2':
    case 'tz3':
      return concat(
        0, // tag
        exports.encodeAddress(address)
      );

    // Originated
    case 'KT1':
      return concat(
        1, // tag
        bare,
        0 // padding
      );
    default:
      throw new Error(`Unsupported address prefix "${prefix}"`);
  }
}

/**
 * Encode a Zarith variable-length unsigned integer
 *
 * @param {BigInt} integer
 * @returns {Uint8Array} Zarith byte array
 *
 * @see {@link https://github.com/ocaml/Zarith|The Zarith library}
 */
function encodeZarith(integer: bigint) {
  if (integer < 0n) {
    throw new RangeError('Cannot encode negative integers');
  }
  if (integer == 0n) {
    return new Uint8Array([0]);
  }
  const bytes = [];
  let remainder = integer;
  while (remainder > 0n) {
    const word = Number(remainder & 127n);
    const flag = remainder > 128n ? 128 : 0;
    bytes.push(word | flag);
    remainder >>= 7n;
  }
  return new Uint8Array(bytes);
}

/**
 * Micheline encode transaction parameters
 *
 * @param {object} data Parameters data
 * @returns {Uint8Array} Transaction parameters as Micheline binary
 *
 * @see Refer to the Micheline schema for `008-PtEdo2Zk.operation`,
 * item "X_0"
 *
 * `$ tezos-codec describe 008-PtEdo2Zk.operation binary schema`
 */
function encodeParameters(data: any) {
  // The following code is highly ideosyncratic,
  // supporting only operations published by a TzStamp server

  // Validate supported parameters
  if (data.entrypoint != 'default') {
    throw new Error('Only the default entrypoint is supported');
  }
  if (Object.keys(data.value).length != 1 || !('bytes' in data.value)) {
    throw new Error('Only a single value of type "bytes" is supported');
  }

  // Published root payload
  const payload = Hex.parse(data.value.bytes);

  return concat(
    255, // parameters flag
    0, // entrypoint "default"
    encodeVariable(encodeArbitrary(payload))
  );
}

function encodeVariable(bytes: any) {
  const size = Hex.parse(
    // hacky
    bytes.length.toString(16).padStart(8, '0')
  );
  return concat(size, bytes);
}

function encodeArbitrary(bytes: any) {
  return concat(
    10, //tag
    encodeVariable(bytes)
  );
}

export {
  encodeOperationGroup,
  encodeBranch,
  encodeSignature,
  encodeContents,
  operationEncoders,
  encodeOperation,
  encodeReveal,
  encodeTransaction,
  encodePublicKey,
  encodeAddress,
  encodeContractId,
  encodeZarith,
  encodeParameters,
  encodeVariable,
  encodeArbitrary
};
