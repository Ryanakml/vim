const ENCRYPTED_PREFIX = "enc:v1:";

function bytesToBase64(bytes: Uint8Array): string {
  // Node
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  // Edge / browser
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  // eslint-disable-next-line no-undef
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }

  // eslint-disable-next-line no-undef
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const encoded = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return await crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Encrypt a secret string for storage.
 *
 * If `API_KEY_ENCRYPTION_SECRET` is not set, returns the input unchanged.
 */
export async function encryptSecretForStorage(
  plaintext: string,
): Promise<string> {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    console.warn(
      "[secrets] API_KEY_ENCRYPTION_SECRET not set; storing secret in plaintext.",
    );
    return plaintext;
  }

  if (isEncryptedSecret(plaintext)) {
    return plaintext;
  }

  const key = await deriveAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded),
  );

  return `${ENCRYPTED_PREFIX}${bytesToBase64(iv)}:${bytesToBase64(ciphertext)}`;
}

/**
 * Decrypt a stored secret.
 *
 * - If the value is plaintext (no prefix), returns it unchanged.
 * - If encrypted but `API_KEY_ENCRYPTION_SECRET` is missing, returns null.
 */
export async function decryptSecretFromStorage(
  stored: string | null | undefined,
): Promise<string | null> {
  if (!stored) return null;
  if (!isEncryptedSecret(stored)) return stored;

  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    console.error(
      "[secrets] Encrypted secret present but API_KEY_ENCRYPTION_SECRET is not set.",
    );
    return null;
  }

  const payload = stored.slice(ENCRYPTED_PREFIX.length);
  const [ivB64, cipherB64] = payload.split(":");
  if (!ivB64 || !cipherB64) {
    console.error("[secrets] Encrypted secret payload is malformed.");
    return null;
  }

  const key = await deriveAesKey(secret);
  const iv = base64ToBytes(ivB64);
  const ciphertext = base64ToBytes(cipherB64);

  try {
    const plaintextBytes = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toArrayBuffer(iv) },
        key,
        toArrayBuffer(ciphertext),
      ),
    );
    return new TextDecoder().decode(plaintextBytes);
  } catch {
    console.error("[secrets] Failed to decrypt secret.");
    return null;
  }
}
