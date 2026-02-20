import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';
import { notesRouter } from './routes/notes.js';
import { createStorage } from './storage/factory.js';
import { Storage } from './storage/interface.js';
import fs from 'fs/promises';
import { Env, PORT, STORAGE_TYPE, validateEnv } from './utils/env.js';


// Global storage instance that will be set during initialization
let globalStorage: Storage | undefined;

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use(logger());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowMethods: ['GET', 'POST'],
}));

// Rate limiter: 10 requests per minute per IP for all routes
const limiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 10, // 10 requests per window
  standardHeaders: 'draft-6',
  keyGenerator: (c) => {
    // Use IP address as key, fallback to 'unknown'
    return c.req.header('x-forwarded-for') || 'unknown';
  },
});
// Apply rate limiting to all /n routes
app.use('/n*', limiter);

// Body size limiter (max 1MB for all routes)
const MAX_BODY_SIZE = 1024 * 1024; // 1MB

app.use('*', async (c, next) => {
  const method = c.req.method;
  // Check Content-Length header for requests with body
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const contentLength = c.req.header('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!isNaN(size) && size > MAX_BODY_SIZE) {
        return c.json({ error: `Request body too large (max ${MAX_BODY_SIZE} bytes)` }, 413);
      }
    }
  }
  await next();
});

// Storage middleware - uses globalStorage set during initialization
app.use('*', async (c, next) => {
  if (globalStorage) {
    c.env = { STORAGE: globalStorage };
  }
  await next();
});

// Health check with storage verification
app.get('/health', async (c) => {
  try {
    const env = c.env;
    const hasStorage = !!env.STORAGE;

    type HealthResponse = {
      status: string;
      storage: {
        type: string;
        status: string;
        error?: string;
      };
      timestamp: string;
    };

    const healthData: HealthResponse = {
      status: 'ok',
      storage: {
        type: STORAGE_TYPE,
        status: hasStorage ? 'initialized' : 'unknown',
      },
      timestamp: new Date().toISOString(),
    };

    // If storage is available in context, test it
    if (hasStorage) {
      const storage = env.STORAGE!;

      // Test storage connectivity based on type
      if (STORAGE_TYPE === 'redis') {
        try {
          // Test Redis by checking if we can execute a PING command
          await (storage as any).redis.ping();
          healthData.storage.status = 'connected';
        } catch (error: any) {
          healthData.storage.status = 'error';
          healthData.storage.error = error.message;
          return c.json(healthData, 503);
        }
      } else if (STORAGE_TYPE === 'filesystem') {
        try {
          // Test filesystem by checking if data directory exists
          const fsStoragePath = process.env.FS_STORAGE_PATH || './data/notes';
          await fs.access(fsStoragePath);
          healthData.storage.status = 'accessible';
        } catch (error: any) {
          healthData.storage.status = 'error';
          healthData.storage.error = error.message;
          return c.json(healthData, 503);
        }
      }
    }

    return c.json(healthData);
  } catch (error: any) {
    return c.json({ status: 'error', error: error.message }, 500);
  }
});

// Serve the decryption HTML page at root (for direct access without note ID)
app.get('/', async (c) => {
  try {
    // Read and serve the decryption HTML page
    const html = await fs.readFile('./public/decrypt.html', 'utf-8');
    return c.html(html);
  } catch {
    return c.json({ status: 'error', error: 'Cannot serve decryption HTML page' }, 500);
  }
});

// Mount notes router
app.route('/n', notesRouter);

// Initialize storage and start server (only in production)
async function main() {
  try {
    // Validate environment variables
    validateEnv();

    const storage = await createStorage(STORAGE_TYPE);

    // Set up periodic cleanup for filesystem storage
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

    console.log(`🚀 FadNote server starting on port ${PORT}`);
    console.log(`💾 Storage: ${STORAGE_TYPE}`);
    console.log('🛡️  Rate limiting: 10 req/min per IP');

    // Set global storage instance for the middleware to use
    globalStorage = storage;

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

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  main();
}

export { app };