import { FilesystemStorage } from './filesystem.js';
import { RedisStorage } from './redis.js';
import { Storage } from './interface.js';

export type StorageType = 'filesystem' | 'redis';

/**
 * Factory function to create the appropriate storage adapter
 */
export async function createStorage(type: StorageType): Promise<Storage> {
  switch (type) {
    case 'redis':
      return new RedisStorage();
    case 'filesystem':
    default:
      return new FilesystemStorage();
  }
}