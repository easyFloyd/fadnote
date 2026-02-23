import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { Variables } from '../utils/env.js';

export function setupCommonMiddleware(app: Hono<{ Variables: Variables }>) {
  app.use(logger());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    allowMethods: ['GET', 'POST'],
  }));
}
