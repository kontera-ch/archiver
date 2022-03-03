const hexParse = (str: string) => {
  return Buffer.from(str, 'hex');
}

export { hexParse }