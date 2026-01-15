
/**
 * Generates a SHA-256 hash of a string to provide record integrity.
 * This is the foundation of the RepairGuardAI Forensic Layer.
 */
export async function generateHash(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Creates a unique forensic fingerprint for the record.
 * Implements Hash Chaining: current_hash = SHA256(data + previous_hash)
 * This ensures that if any historical record is tampered with, the entire 
 * chain of evidence thereafter becomes invalid.
 */
export async function signRecord(data: any, prevHash: string): Promise<string> {
  // We sanitize the data to ensure deterministic hashing
  const forensicPayload = {
    client: data.clientName,
    phone: data.clientPhone,
    device: data.device,
    fault: data.fault,
    cost: data.agreedAmount,
    timestamp: data.timestamp,
    prevHash: prevHash
  };
  
  const content = JSON.stringify(forensicPayload);
  return await generateHash(content);
}

/**
 * Verifies the integrity of a record against its hash.
 */
export async function verifyIntegrity(job: any, prevJobHash: string): Promise<boolean> {
  const expectedHash = await signRecord({
    clientName: job.clientName,
    clientPhone: job.clientPhone,
    device: `${job.deviceBrand} ${job.deviceModel}`,
    fault: job.faultDescription,
    agreedAmount: job.agreedAmount,
    timestamp: job.createdAt
  }, prevJobHash);
  
  return expectedHash === job.recordHash;
}
