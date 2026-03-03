import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { Variables } from '../utils/env.js';

function customLogger() {
  return async (c: any, next: any) => {
    const start = Date.now();
    const startTime = new Date().toISOString();
    console.log(`[${startTime}] <-- ${c.req.method} ${c.req.url}`);
    await next();
    const duration = Date.now() - start;
    const endTime = new Date().toISOString();
    console.log(`[${endTime}] --> ${c.req.method} ${c.req.url} ${c.res.status} ${duration}ms`);
  };
}

export function setupCommonMiddleware(app: Hono<{ Variables: Variables }>) {
  app.use(customLogger());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    allowMethods: ['GET', 'POST'],
  }));

  // Serve static files from public directory
  app.use('/images/*', serveStatic({ root: './public' }));
  app.use('/css/*', serveStatic({ root: './public' }));
  app.use('/js/*', serveStatic({ root: './public' }));
}
