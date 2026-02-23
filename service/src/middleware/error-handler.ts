import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Variables } from '../utils/env.js';

export function setupErrorHandler(app: Hono<{ Variables: Variables }>) {
  app.onError((err, c) => {
    // Log the error for debugging
    console.error(`[Error] ${err.message}`, err);

    // If it's an HTTPException (thrown by Hono or middleware), use its response
    if (err instanceof HTTPException) {
      return c.newResponse(err.message, err.status);
    }

    // Handle BodyLimitError from hono/body-limit middleware
    if (err.name === 'BodyLimitError') {
      return c.json({ error: 'Request body too large' }, 413);
    }

    // Generic 500 for unexpected errors
    return c.json({ error: 'Internal server error' }, 500);
  });
}
