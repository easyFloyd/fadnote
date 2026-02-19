import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FilesystemStorage } from '../../src/storage/filesystem';
import fs from 'fs/promises';
import path from 'path';

const TEST_DIR = './test-data/notes';

describe('FilesystemStorage', () => {
  let storage: FilesystemStorage;

  beforeEach(async () => {
    // Clean test directory before each test
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
    storage = new FilesystemStorage(TEST_DIR);
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('set and get', () => {
    it('should store and retrieve data', async () => {
      const data = Buffer.from('Hello, World!');
      await storage.set('test-id', data);

      const retrieved = await storage.get('test-id');
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent data', async () => {
      const result = await storage.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle binary data', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);
      await storage.set('binary-id', binaryData);

      const retrieved = await storage.get('binary-id');
      expect(retrieved).toEqual(binaryData);
    });
  });

  describe('exists', () => {
    it('should return true for existing data', async () => {
      const data = Buffer.from('Test');
      await storage.set('exists-id', data);

      expect(await storage.exists('exists-id')).toBe(true);
    });

    it('should return false for non-existent data', async () => {
      expect(await storage.exists('nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing data', async () => {
      const data = Buffer.from('To be deleted');
      await storage.set('delete-me', data);

      // Verify it exists
      expect(await storage.exists('delete-me')).toBe(true);

      // Delete it
      await storage.delete('delete-me');

      // Verify it's gone
      expect(await storage.exists('delete-me')).toBe(false);
      expect(await storage.get('delete-me')).toBeNull();
    });

    it('should not throw when deleting non-existent data', async () => {
      await expect(storage.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('hasExpired', () => {
    it('should return false for data without TTL', async () => {
      const data = Buffer.from('No TTL');
      await storage.set('no-ttl', data);

      expect(await storage.hasExpired('no-ttl')).toBe(false);
    });

    it('should return false for non-expired data', async () => {
      const data = Buffer.from('Future expiry');
      await storage.set('future', data, 3600); // 1 hour from now

      expect(await storage.hasExpired('future')).toBe(false);
    });

    it('should return true for expired data', async () => {
      const data = Buffer.from('Expired');
      await storage.set('expired', data, 1); // 1 second TTL

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(await storage.hasExpired('expired')).toBe(true);
    });

    it('should return false for non-existent data', async () => {
      expect(await storage.hasExpired('nonexistent')).toBe(false);
    });
  });

  describe('cleanupExpired', () => {
    it('should delete expired notes', async () => {
      // Create expired notes
      await storage.set('expired1', Buffer.from('Expired 1'), -1); // Already expired
      await storage.set('expired2', Buffer.from('Expired 2'), -1);
      await storage.set('valid', Buffer.from('Valid'), 3600); // Still valid

      // Verify they exist
      expect(await storage.exists('expired1')).toBe(true);
      expect(await storage.exists('expired2')).toBe(true);
      expect(await storage.exists('valid')).toBe(true);

      // Run cleanup
      const deletedCount = await storage.cleanupExpired();
      expect(deletedCount).toBe(2);

      // Verify expired are gone, valid remains
      expect(await storage.exists('expired1')).toBe(false);
      expect(await storage.exists('expired2')).toBe(false);
      expect(await storage.exists('valid')).toBe(true);
    });

    it('should return 0 when no expired notes', async () => {
      await storage.set('valid1', Buffer.from('Valid 1'), 3600);
      await storage.set('valid2', Buffer.from('Valid 2'), 3600);

      const deletedCount = await storage.cleanupExpired();
      expect(deletedCount).toBe(0);

      // Verify notes still exist
      expect(await storage.exists('valid1')).toBe(true);
      expect(await storage.exists('valid2')).toBe(true);
    });
  });

  describe('get with expiration', () => {
    it('should delete and return null for expired data', async () => {
      const data = Buffer.from('Will expire');
      await storage.set('delete-on-get', data, -1); // Already expired

      // First get should delete and return null
      const result = await storage.get('delete-on-get');
      expect(result).toBeNull();

      // Second get should still return null
      const result2 = await storage.get('delete-on-get');
      expect(result2).toBeNull();
    });
  });

  describe('ID sanitization', () => {
    it('should prevent directory traversal', async () => {
      const data = Buffer.from('Test');

      // Try to create file outside directory
      await expect(storage.set('../../../etc/passwd', data)).rejects.toThrow();
    });

    it('should handle valid IDs with allowed characters', async () => {
      const validIds = ['abc123', 'ABC123', 'abc_123', 'abc-123'];

      for (const id of validIds) {
        const data = Buffer.from(`Data for ${id}`);
        await storage.set(id, data);
        expect(await storage.get(id)).toEqual(data);
      }
    });
  });

  describe('TTL metadata', () => {
    it('should create metadata file when TTL is specified', async () => {
      const data = Buffer.from('With TTL');
      await storage.set('with-ttl', data, 3600);

      const metaPath = path.join(TEST_DIR, 'with-ttl.enc.meta');
      const metaExists = await fs.access(metaPath).then(() => true).catch(() => false);
      expect(metaExists).toBe(true);

      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);
      expect(meta).toHaveProperty('expires');
      expect(meta.expires).toBeGreaterThan(Date.now());
    });

    it('should not create metadata file when no TTL is specified', async () => {
      const data = Buffer.from('No metadata');
      await storage.set('no-metadata', data);

      const metaPath = path.join(TEST_DIR, 'no-metadata.enc.meta');
      const metaExists = await fs.access(metaPath).then(() => true).catch(() => false);
      expect(metaExists).toBe(false);
    });
  });
});
