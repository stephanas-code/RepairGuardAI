
/**
 * Generates a SHA-256 hash of a string to provide record integrity.
 */
export async function generateHash(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Creates a unique fingerprint for the record including data and previous hash.
 */
export async function signRecord(data: any, prevHash: string): Promise<string> {
  const content = JSON.stringify(data) + prevHash;
  return await generateHash(content);
}
