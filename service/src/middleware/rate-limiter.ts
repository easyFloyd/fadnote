import { Hono } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { Variables } from '../utils/env.js';

export function setupRateLimiter(app: Hono<{ Variables: Variables }>) {
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
}
