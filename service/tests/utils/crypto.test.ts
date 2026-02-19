import { describe, it, expect } from 'vitest';
import { encryptNote, decryptNote, generateNoteId, generateKey } from '../../src/utils/crypto';

describe('Crypto Utilities', () => {
  describe('generateNoteId', () => {
    it('should generate a valid 32-character hex string', () => {
      const id = generateNoteId();
      expect(id).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateNoteId();
      const id2 = generateNoteId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateKey', () => {
    it('should generate a valid 64-character hex string', () => {
      const key = generateKey();
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('encryptNote and decryptNote', () => {
    it('should encrypt and decrypt text correctly', async () => {
      const plaintext = 'This is a secret message!';
      const { encrypted, key } = await encryptNote(plaintext);

      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('salt');
      expect(key).toBeDefined();
      expect(key).toMatch(/^[a-f0-9]{64}$/);

      const decrypted = await decryptNote(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters and unicode', async () => {
      const plaintext = 'Hello! @#$%^&*() 世界 🌍 مرحبا';
      const { encrypted, key } = await encryptNote(plaintext);
      const decrypted = await decryptNote(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty text', async () => {
      const plaintext = '';
      const { encrypted, key } = await encryptNote(plaintext);
      const decrypted = await decryptNote(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle large text (up to 1MB)', async () => {
      const plaintext = 'x'.repeat(1024 * 500); // 500KB
      const { encrypted, key } = await encryptNote(plaintext);
      const decrypted = await decryptNote(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should use the provided key if given', async () => {
      const plaintext = 'Secret message';
      const customKey = generateKey();

      const { encrypted, key } = await encryptNote(plaintext, customKey);
      expect(key).toBe(customKey);

      const decrypted = await decryptNote(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should fail to decrypt with wrong key', async () => {
      const plaintext = 'Secret message';
      const { encrypted } = await encryptNote(plaintext);
      const wrongKey = generateKey();

      await expect(decryptNote(encrypted, wrongKey)).rejects.toThrow();
    });

    it('should fail with tampered ciphertext', async () => {
      const plaintext = 'Secret message';
      const { encrypted, key } = await encryptNote(plaintext);

      // Tamper with the ciphertext
      const tampered = {
        ...encrypted,
        ciphertext: encrypted.ciphertext + 'tampered',
      };

      await expect(decryptNote(tampered, key)).rejects.toThrow();
    });

    it('should produce different ciphertexts for same plaintext', async () => {
      const plaintext = 'Same message';
      const { encrypted: encrypted1 } = await encryptNote(plaintext);
      const { encrypted: encrypted2 } = await encryptNote(plaintext);

      // IV and salt should be different, making ciphertexts different
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });
  });
});
