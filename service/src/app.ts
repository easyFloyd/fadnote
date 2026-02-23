import { Hono } from 'hono';
import { Storage } from './storage/interface.js';
import { Variables } from './utils/env.js';
import { setupMiddleware } from './middleware/index.js';
import { healthRoute } from './routes/health.js';
import { rootRoute } from './routes/root.js';
import { notesRouter } from './routes/notes.js';

export function createApp(storage: Storage) {
  // Create Hono app
  const app = new Hono<{ Variables: Variables }>();

  // Setup all middleware with storage
  setupMiddleware(app, storage);

  // Mount routes
  app.route('/health', healthRoute);
  app.route('/', rootRoute);
  app.route('/n', notesRouter);

  return app;
}
