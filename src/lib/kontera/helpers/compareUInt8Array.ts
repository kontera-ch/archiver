const compareUInt8Array = function (a: Uint8Array, b: Uint8Array) {
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] < b[i]) {
      return false;
    }

    if (a[i] > b[i]) {
      return false;
    }
  }

  if (a.byteLength > b.byteLength) {
    return false;
  }

  if (a.byteLength < b.byteLength) {
    return false;
  }

  return true;
};

export { compareUInt8Array };
