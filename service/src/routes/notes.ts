import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

/**
 * Notes Routes
 * 
 * POST /n/:id - Store an encrypted note
 * GET /n/:id - Retrieve and delete a note (one-time read)
 * 
 * The server NEVER sees the decryption key.
 * The key is in the URL fragment (#key) which is never sent to the server.
 */

const notes = new Hono();

// Store a new encrypted note
notes.post('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const storage = c.env.STORAGE;
    
    // Validate ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return c.json({ error: 'Invalid ID format' }, 400);
    }
    
    // Check if ID already exists
    const exists = await storage.exists(id);
    if (exists) {
      return c.json({ error: 'Note ID already exists' }, 409);
    }
    
    // Get the encrypted blob from request body
    const blob = Buffer.from(await c.req.arrayBuffer());
    
    // Validate blob is not empty and not too large (max 1MB)
    if (blob.length === 0) {
      return c.json({ error: 'Empty note' }, 400);
    }
    if (blob.length > 1024 * 1024) {
      return c.json({ error: 'Note too large (max 1MB)' }, 413);
    }
    
    // Get TTL from header (default: 24 hours)
    const ttlHeader = c.req.header('X-Note-TTL');
    const ttlSeconds = ttlHeader ? parseInt(ttlHeader, 10) : 86400;
    
    // Store the encrypted blob
    await storage.set(id, blob, ttlSeconds);
    
    return c.json({ 
      success: true, 
      id,
      expiresIn: ttlSeconds 
    }, 201);
    
  } catch (error) {
    console.error('Error storing note:', error);
    return c.json({ error: 'Failed to store note' }, 500);
  }
});

// Retrieve and delete a note (ONE-TIME READ)
notes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const storage = c.env.STORAGE;
    
    // Validate ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return c.json({ error: 'Invalid ID format' }, 400);
    }
    
    // Retrieve the encrypted blob
    const blob = await storage.get(id);
    
    if (!blob) {
      return c.json({ 
        error: 'Note not found or already viewed',
        hint: 'Notes are deleted after first view'
      }, 404);
    }
    
    // CRITICAL: Delete immediately after retrieval (one-time read)
    await storage.delete(id);
    
    // Return the encrypted blob
    // The client will decrypt using the key from URL fragment
    c.header('Content-Type', 'application/octet-stream');
    c.header('X-Note-Status', 'deleted');
    
    return c.body(blob);
    
  } catch (error) {
    console.error('Error retrieving note:', error);
    return c.json({ error: 'Failed to retrieve note' }, 500);
  }
});

// Serve the decryption HTML page for browser access
notes.get('/', async (c) => {
  try {
    // Read and serve the decryption HTML page
    const html = await fs.readFile('./public/decrypt.html', 'utf-8');
    return c.html(html);
  } catch {
    // Fallback HTML if file not found
    return c.html(getFallbackHtml());
  }
});

function getFallbackHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>FadNote - Secure Note</title>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    .error { color: #d32f2f; }
    .success { color: #388e3c; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>🔥 FadNote</h1>
  <div id="status">Loading...</div>
  <pre id="content"></pre>
  <script>
    // Decryption logic goes here
    // See full implementation in public/decrypt.html
  </script>
</body>
</html>
  `;
}

export { notes as notesRouter };