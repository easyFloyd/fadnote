import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RedisStorage } from '../../src/storage/redis';
import Redis from 'ioredis';

// Skip Redis tests if not connected (for CI/development)
describe.skipIf(process.env.RUN_REDIS_TESTS !== 'true')('RedisStorage', () => {
  let storage: RedisStorage;
  let redis: Redis;

  beforeAll(async () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    storage = new RedisStorage(redisUrl);
    redis = new Redis(redisUrl);

    // Clean test keys
    const keys = await redis.keys('test:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  afterAll(async () => {
    // Clean up test data
    const keys = await redis.keys('test:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await storage.close();
    await redis.quit();
  });

  describe('set and get', () => {
    it('should store and retrieve data', async () => {
      const data = Buffer.from('Hello, Redis!');
      await storage.set('test:hello', data);

      const retrieved = await storage.get('test:hello');
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent keys', async () => {
      const result = await storage.get('test:nonexistent');
      expect(result).toBeNull();
    });

    it('should handle binary data', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);
      await storage.set('test:binary', binaryData);

      const retrieved = await storage.get('test:binary');
      expect(retrieved).toEqual(binaryData);
    });
  });

  describe('exists', () => {
    it('should return true for existing keys', async () => {
      await storage.set('test:exists', Buffer.from('Test'));
      expect(await storage.exists('test:exists')).toBe(true);
    });

    it('should return false for non-existent keys', async () => {
      expect(await storage.exists('test:nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing data', async () => {
      await storage.set('test:delete-me', Buffer.from('To be deleted'));

      expect(await storage.exists('test:delete-me')).toBe(true);

      await storage.delete('test:delete-me');

      expect(await storage.exists('test:delete-me')).toBe(false);
      expect(await storage.get('test:delete-me')).toBeNull();
    });

    it('should handle delete on non-existent keys', async () => {
      await expect(storage.delete('test:nonexistent')).resolves.not.toThrow();
    });
  });

  describe('TTL support', () => {
    it('should expire data after TTL', async () => {
      await storage.set('test:ttl-test', Buffer.from('Expires quickly'), 1); // 1 second

      // Should exist immediately
      expect(await storage.exists('test:ttl-test')).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired now
      const result = await storage.get('test:ttl-test');
      expect(result).toBeNull();
    }, 10000); // Increase timeout for this test

    it('should respect default TTL when none provided', async () => {
      await storage.set('test:default-ttl', Buffer.from('Default TTL'));

      const ttl = await redis.ttl('test:default-ttl');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBe(86400); // 24 hours
    });
  });
});
