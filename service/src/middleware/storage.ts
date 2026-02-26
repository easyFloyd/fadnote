import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { Storage } from '../storage/interface.js';
import { Variables } from '../utils/env.js';

export function setupStorageMiddleware(storage: Storage) {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    c.set('storage', storage);
    await next();
  });
}
