import { Hono } from 'hono';
import { Storage } from '../storage/interface.js';
import { Variables } from '../utils/env.js';
import { setupCommonMiddleware } from './common.js';
import { setupRateLimiter } from './rate-limiter.js';
import { setupBodySizeLimit } from './body-size.js';
import { setupStorageMiddleware } from './storage.js';
import { setupErrorHandler } from './error-handler.js';

export function setupMiddleware(app: Hono<{ Variables: Variables }>, storage: Storage) {
  setupCommonMiddleware(app);
  setupRateLimiter(app);
  setupBodySizeLimit(app);
  app.use(setupStorageMiddleware(storage));
  setupErrorHandler(app);
}
