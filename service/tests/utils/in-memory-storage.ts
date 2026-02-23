import { Storage } from '../../src/storage/interface.js';

interface StorageItem {
  buffer: Buffer;
  expires?: number;
}

/**
 * In-Memory Storage Adapter for Testing
 *
 * Fast, isolated storage that doesn't touch disk or network.
 * Perfect for unit tests - no cleanup needed, just create a new instance.
 */
export class InMemoryStorage implements Storage {
  private data = new Map<string, StorageItem>();

  async get(id: string): Promise<Buffer | null> {
    const item = this.data.get(id);
    if (!item) return null;

    // Check expiration
    if (item.expires && Date.now() > item.expires) {
      this.data.delete(id);
      return null;
    }

    return item.buffer;
  }

  async set(id: string, blob: Buffer, ttlSeconds?: number): Promise<void> {
    const expires = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
    this.data.set(id, { buffer: blob, expires });
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const item = this.data.get(id);
    if (!item) return false;

    // Check if expired
    if (item.expires && Date.now() > item.expires) {
      this.data.delete(id);
      return false;
    }

    return true;
  }

  async ping(): Promise<void> {
    // In-memory storage is always healthy
    return;
  }

  /**
   * Clear all data (useful for test cleanup)
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * Get count of stored items (useful for assertions)
   */
  size(): number {
    return this.data.size;
  }
}
