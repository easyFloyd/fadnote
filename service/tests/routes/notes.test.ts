import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import { notesRouter } from '../../src/routes/notes';
import { createStorage } from '../../src/storage/factory';
import { encryptNote } from '../../src/utils/crypto';
import fs from 'fs/promises';

const TEST_DIR = './test-data/notes';

describe('Notes API Routes', () => {
  let app: Hono;
  let storage: any;

  beforeAll(async () => {
    // Clean and initialize test environment
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    storage = await createStorage('filesystem');

    // Create test app with storage context
    app = new Hono();
    app.use('*', async (c, next) => {
      c.env = { ...c.env, STORAGE: storage };
      await next();
    });
    app.route('/n', notesRouter);
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('POST /n/:id', () => {
    it('should store an encrypted note successfully', async () => {
      const { encrypted } = await encryptNote('Secret message');
      const encryptedData = Buffer.from(JSON.stringify(encrypted));

      const req = new Request('http://localhost/n/test123', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: encryptedData,
      });

      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual({
        success: true,
        id: 'test123',
        expiresIn: 86400,
      });
    });

    it('should respect custom TTL header', async () => {
      const { encrypted } = await encryptNote('Secret message');
      const encryptedData = Buffer.from(JSON.stringify(encrypted));

      const req = new Request('http://localhost/n/custom-ttl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Note-TTL': '3600', // 1 hour
        },
        body: encryptedData,
      });

      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.expiresIn).toBe(3600);
    });

    it('should reject invalid ID format', async () => {
      const { encrypted } = await encryptNote('Secret message');
      const encryptedData = Buffer.from(JSON.stringify(encrypted));

      const req = new Request('http://localhost/n/invalid@id!', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: encryptedData,
      });

      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Invalid ID format');
    });

    it('should reject empty notes', async () => {
      const req = new Request('http://localhost/n/empty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: Buffer.alloc(0), // Empty buffer
      });

      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Empty note');
    });

    it('should reject notes that are too large', async () => {
      const largeData = Buffer.alloc(1024 * 1024 + 1); // Just over 1MB

      const req = new Request('http://localhost/n/large', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: largeData,
      });

      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(413);
      expect(body.error).toContain('too large');
    });

    it('should reject duplicate IDs', async () => {
      const { encrypted } = await encryptNote('First note');
      const encryptedData = Buffer.from(JSON.stringify(encrypted));

      // Store first note
      await app.request(new Request('http://localhost/n/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: encryptedData,
      }));

      // Try to store duplicate
      const res = await app.request(new Request('http://localhost/n/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: encryptedData,
      }));

      const body = await res.json();
      expect(res.status).toBe(409);
      expect(body.error).toBe('Note ID already exists');
    });
  });

  describe('GET /n/:id', () => {
    it('should retrieve and delete note on first fetch (one-time read)', async () => {
      // Store a note
      const { encrypted } = await encryptNote('Secret message');
      const encryptedData = Buffer.from(JSON.stringify(encrypted));

      await app.request(new Request('http://localhost/n/onetime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: encryptedData,
      }));

      // First GET should succeed
      const req1 = new Request('http://localhost/n/onetime');
      const res1 = await app.request(req1);

      expect(res1.status).toBe(200);
      expect(res1.headers.get('X-Note-Status')).toBe('deleted');
      expect(res1.headers.get('Content-Type')).toBe('application/octet-stream');

      // Verify the data matches
      const retrievedData = Buffer.from(await res1.arrayBuffer());
      expect(retrievedData).toEqual(encryptedData);

      // Second GET should return 404
      const req2 = new Request('http://localhost/n/onetime');
      const res2 = await app.request(req2);

      expect(res2.status).toBe(404);
      const body = await res2.json();
      expect(body.error).toContain('already viewed');
    });

    it('should return 404 for non-existent notes', async () => {
      const req = new Request('http://localhost/n/nonexistent');
      const res = await app.request(req);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain('not found');
    });

    it('should reject invalid ID format', async () => {
      const req = new Request('http://localhost/n/invalid@id!');
      const res = await app.request(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid ID format');
    });

    it('should delete expired notes when accessed', async () => {
      // Create an expired note
      const { encrypted } = await encryptNote('Expired');
      const encryptedData = Buffer.from(JSON.stringify(encrypted));

      const storageInstance = storage as any;
      await storageInstance.set('expired-on-get', encryptedData, -1); // Already expired

      // Get should return null (404 after conversion)
      const req = new Request('http://localhost/n/expired-on-get');
      const res = await app.request(req);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /n/ (decryption page)', () => {
    it('should serve HTML decryption page', async () => {
      const req = new Request('http://localhost/n/');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('FadNote');
    });
  });

  describe('One-time read guarantee', () => {
    it('should delete note after first read (one-time read)', async () => {
      // Store a note
      const { encrypted } = await encryptNote('One-time read test');
      const encryptedData = Buffer.from(JSON.stringify(encrypted));

      await app.request(new Request('http://localhost/n/onetime-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: encryptedData,
      }));

      // Verify it was stored
      expect(await storage.exists('onetime-test')).toBe(true);

      // First read should succeed
      const res1 = await app.request(new Request('http://localhost/n/onetime-test'));
      expect(res1.status).toBe(200);

      // Note should be deleted now
      expect(await storage.exists('onetime-test')).toBe(false);

      // Second read should fail
      const res2 = await app.request(new Request('http://localhost/n/onetime-test'));
      expect(res2.status).toBe(404);
    });
  });
});
