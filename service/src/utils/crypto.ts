/**
 * Client-Side Encryption Utilities
 * 
 * These functions run in the browser/skill/plugin.
 * The server NEVER sees the unencrypted content or the decryption key.
 */

export interface EncryptedNote {
  /** Encrypted data as base64 */
  ciphertext: string;
  /** Initialization vector */
  iv: string;
  /** Salt for key derivation */
  salt: string;
}

/**
 * Generate a cryptographically secure random ID
 */
export function generateNoteId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure encryption key
 */
export function generateKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext using AES-256-GCM
 */
export async function encryptNote(plaintext: string, key?: string): Promise<{ encrypted: EncryptedNote; key: string }> {
  const encryptionKey = key || generateKey();
  const encoder = new TextEncoder();
  const plaintextBuffer = encoder.encode(plaintext);
  
  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Derive key
  const cryptoKey = await deriveKey(encryptionKey, salt);
  
  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    plaintextBuffer
  );
  
  return {
    encrypted: {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv),
      salt: arrayBufferToBase64(salt)
    },
    key: encryptionKey
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 */
export async function decryptNote(encrypted: EncryptedNote, key: string): Promise<string> {
  const salt = base64ToArrayBuffer(encrypted.salt);
  const iv = base64ToArrayBuffer(encrypted.iv);
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);
  
  // Derive key
  const cryptoKey = await deriveKey(key, new Uint8Array(salt));
  
  // Decrypt
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    cryptoKey,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(plaintextBuffer);
}

/**
 * Convert ArrayBuffer or TypedArray to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}