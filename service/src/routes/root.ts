import { Hono } from 'hono';
import fs from 'fs/promises';

const app = new Hono();

// Serve the decryption HTML page at root (for direct access without note ID)
app.get('/', async (c) => {
  try {
    // Read and serve the decryption HTML page
    const html = await fs.readFile('./public/decrypt.html', 'utf-8');
    return c.html(html);
  } catch {
    return c.json({ status: 'error', error: 'Cannot serve decryption HTML page' }, 500);
  }
});

export const rootRoute = app;
