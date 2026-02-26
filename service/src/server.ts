import { serve } from '@hono/node-server';
import { createStorage } from './storage/factory.js';
import { Storage } from './storage/interface.js';
import { PORT, STORAGE_TYPE, validateEnv } from './utils/env.js';
import { createApp } from './app.js';

async function scheduleCleanup(storage: Storage) {
  if (STORAGE_TYPE === 'filesystem') {
    const cleanupFiles = async () => {
      const deleted = await (storage as any).cleanupExpired?.();
      if (deleted && deleted > 0) {
        console.log(`🧹 Cleaned up ${deleted} expired notes`);
      }
    };

    // Run cleanup on startup
    await cleanupFiles();

    // Run cleanup every hour
    setInterval(cleanupFiles, 60 * 60 * 1000);
    console.log('🧹 Filesystem TTL cleanup scheduled (every hour)');
  }
}

export async function startServer() {
  try {
    // Validate environment variables
    validateEnv();

    const storage = await createStorage(STORAGE_TYPE);

    // Set up periodic cleanup for filesystem storage
    await scheduleCleanup(storage);

    console.log(`🚀 FadNote server starting on port ${PORT}`);
    console.log(`💾 Storage: ${STORAGE_TYPE}`);
    console.log('🛡️  Rate limiting: 10 req/min per IP');

    // Create app with storage
    const app = createApp(storage);

    // Start server
    serve({
      fetch: app.fetch,
      port: Number(PORT)
    }, (info) => {
      console.log(`✅ FadNote ready at http://localhost:${info.port}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
