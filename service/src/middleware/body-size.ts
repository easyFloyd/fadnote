import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { Variables } from '../utils/env.js';

const MAX_BODY_SIZE = 1024 * 1024; // 1MB

export function setupBodySizeLimit(app: Hono<{ Variables: Variables }>) {
  app.use(
    bodyLimit({
      maxSize: MAX_BODY_SIZE,
      onError: (c) => {
        return c.json({ error: `Request body too large (max ${MAX_BODY_SIZE} bytes)` }, 413);
      },
    })
  );
}
