import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { notesRouter } from './routes/notes.js';
import { createStorage } from './storage/factory.js';

// Environment configuration
const PORT = process.env.PORT || 3000;
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'filesystem';

// Create Hono app
const app = new Hono();

// Middleware
app.use(logger());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowMethods: ['GET', 'POST'],
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', storage: STORAGE_TYPE }));

// Mount notes router
app.route('/n', notesRouter);

// Serve static files (decryption page)
app.get('/', (c) => c.redirect('/n'));

// Initialize storage and start server
async function main() {
  try {
    const storage = await createStorage(STORAGE_TYPE);
    
    // Store storage in context for routes
    app.use('*', async (c, next) => {
      c.env = { ...c.env, STORAGE: storage };
      await next();
    });
    
    console.log(`🚀 FadNote server starting on port ${PORT}`);
    console.log(`💾 Storage: ${STORAGE_TYPE}`);
    
    // For Node.js/Bun/Deno
    const server = Bun ? 
      Bun.serve({ fetch: app.fetch, port: Number(PORT) }) :
      // Fallback for Node.js
      (await import('http')).createServer((req, res) => {
        // Convert Node request to Web Standard Request
        // This is simplified - in production use @hono/node-server
      });
    
    if (!Bun) {
      console.log('⚠️  For Node.js, install @hono/node-server and update index.ts');
    }
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

export { app };