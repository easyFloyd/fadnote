import { Storage } from '../storage/interface.js';

// Environment configuration
export const PORT = process.env.PORT || 3000;
export const STORAGE_TYPE = (process.env.STORAGE_TYPE || 'filesystem') as 'filesystem' | 'redis';

// Hono context variables type (used with c.get/c.set)
export type Variables = {
  storage: Storage;
};
  

// Validate environment variables
export function validateEnv(): void {
    const validStorageTypes = ['filesystem', 'redis'];
  
    if (!validStorageTypes.includes(STORAGE_TYPE)) {
      throw new Error(
        `Invalid STORAGE_TYPE: ${STORAGE_TYPE}. Must be one of: ${validStorageTypes.join(', ')}`
      );
    }
  
    if (STORAGE_TYPE === 'redis' && !process.env.REDIS_URL) {
      throw new Error(
        'REDIS_URL environment variable is required when STORAGE_TYPE=redis'
      );
    }
  
    const portNum = Number(PORT);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      throw new Error(`Invalid PORT: ${PORT}. Must be a number between 1 and 65535`);
    }
  
    // Warn about insecure CORS in production
    const corsOrigin = process.env.CORS_ORIGIN || '*';
    if (corsOrigin === '*' && process.env.NODE_ENV === 'production') {
      console.warn(
        '⚠️  WARNING: CORS_ORIGIN is set to "*" in production! ' +
        'This is insecure. Set CORS_ORIGIN to your specific domain.'
      );
    }
    if (corsOrigin === '*') {
      console.warn(
        '⚠️  CORS is using wildcard "*". For better security, ' +
        'set CORS_ORIGIN to your specific domain in production.'
      );
    }
  
    console.log('✅ Environment variables validated');
  }
  