import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';
import { notesRouter } from './routes/notes.js';
import { createStorage } from './storage/factory.js';
import fs from 'fs/promises';

// Environment configuration
const PORT = process.env.PORT || 3000;
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'filesystem';

// Validate environment variables
function validateEnv(): void {
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

// Create Hono app
const app = new Hono();

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
app.use('/n/*', limiter); // Apply rate limiting only to API routes

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

// Health check with storage verification
app.get('/health', async (c) => {
  try {
    const storage = c.env.STORAGE;
    const healthData = {
      status: 'ok',
      storage: {
        type: STORAGE_TYPE,
        status: 'unknown',
      },
      timestamp: new Date().toISOString(),
    };

    if (!storage) {
      return c.json({ ...healthData, storage: { type: STORAGE_TYPE, status: 'error', error: 'Storage not initialized' } }, 503);
    }

    // Test storage connectivity based on type
    if (STORAGE_TYPE === 'redis') {
      try {
        // Test Redis by checking if we can execute a PING command
        await (storage as any).redis.ping();
        healthData.storage.status = 'connected';
        return c.json(healthData);
      } catch (error: any) {
        healthData.storage.status = 'error';
        healthData.storage.error = error.message;
        return c.json(healthData, 503);
      }
    }

    if (STORAGE_TYPE === 'filesystem') {
      try {
        // Test filesystem by checking if data directory exists
        await fs.access('./data/notes');
        healthData.storage.status = 'accessible';
        return c.json(healthData);
      } catch (error: any) {
        healthData.storage.status = 'error';
        healthData.storage.error = error.message;
        return c.json(healthData, 503);
      }
    }

    return c.json(healthData);
  } catch (error: any) {
    return c.json({ status: 'error', error: error.message }, 500);
  }
});

// Mount notes router
app.route('/n', notesRouter);

// Serve static files (decryption page)
app.get('/', (c) => c.redirect('/n'));

// Initialize storage and start server
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

    // Add storage instance to context
    app.use('*', async (c, next) => {
      c.env = { ...c.env, STORAGE: storage };
      await next();
    });
    
    // Store storage in context for routes
    app.use('*', async (c, next) => {
      c.env = { ...c.env, STORAGE: storage };
      await next();
    });
    
    console.log(`🚀 FadNote server starting on port ${PORT}`);
    console.log(`💾 Storage: ${STORAGE_TYPE}`);
    console.log('🛡️  Rate limiting: 10 req/min per IP');

    // Start Bun server
    const server = Bun.serve({ fetch: app.fetch, port: Number(PORT) });

    console.log(`✅ Server ready at http://localhost:${PORT}`);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

export { app };