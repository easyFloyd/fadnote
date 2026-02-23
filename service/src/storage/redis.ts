import Redis from 'ioredis';
import { Storage } from './interface.js';

/**
 * Redis Storage Adapter
 * 
 * For production self-hosted deployments.
 * Requires REDIS_URL environment variable.
 */
export class RedisStorage implements Storage {
  private redis: Redis;
  
  constructor(url?: string) {
    const redisUrl = url || process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }
  
  async get(id: string): Promise<Buffer | null> {
    const data = await this.redis.getBuffer(id);
    return data || null;
  }
  
  async set(id: string, blob: Buffer, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(id, ttlSeconds, blob);
    } else {
      // Default 24 hours if no TTL specified
      await this.redis.setex(id, 86400, blob);
    }
  }
  
  async delete(id: string): Promise<void> {
    await this.redis.del(id);
  }
  
  async exists(id: string): Promise<boolean> {
    const exists = await this.redis.exists(id);
    return exists === 1;
  }

  async ping(): Promise<void> {
    await this.redis.ping();
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}