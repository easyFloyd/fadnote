import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../../src/app';
import { InMemoryStorage } from '../utils/in-memory-storage';
import { encryptNote } from '../../src/utils/crypto';

describe('Notes API Routes', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  describe('POST /n', () => {
    it('should store an encrypted note successfully', async () => {
      const app = createApp(storage);
      const { encrypted } = await encryptNote('Secret message');
      const encryptedData = Buffer.from(JSON.stringify(encrypted));

      const req = new Request('http://localhost/n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: encryptedData,
      });

      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('id');
      expect(body.expiresIn).toBe(86400);
    });

    it('should respect custom TTL header', async () => {
      const app = createApp(storage);
      const { encrypted } = await encryptNote('Secret message');
      const encryptedData = Buffer.from(JSON.stringify(encrypted));

      const req = new Request('http://localhost/n', {
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

    it('should reject empty notes', async () => {
      const app = createApp(storage);
      const req = new Request('http://localhost/n', {
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
      const app = createApp(storage);
      const largeData = Buffer.alloc(1024 * 1024 + 1); // Just over 1MB

      const req = new Request('http://localhost/n', {
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
  });

  describe('GET /n/:id/data', () => {
    it('should retrieve and delete note on first fetch (one-time read)', async () => {
      const app = createApp(storage);
      // Store a note
      const { encrypted } = await encryptNote('Secret message');
      const encryptedData = Buffer.from(JSON.stringify(encrypted));

      const postRes = await app.request(new Request('http://localhost/n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: encryptedData,
      }));
      const { id } = await postRes.json();

      // First GET should succeed
      const req1 = new Request(`http://localhost/n/${id}/data`);
      const res1 = await app.request(req1);

      expect(res1.status).toBe(200);
      expect(res1.headers.get('X-Note-Status')).toBe('deleted');
      expect(res1.headers.get('Content-Type')).toBe('application/octet-stream');

      // Verify the data matches
      const retrievedData = Buffer.from(await res1.arrayBuffer());
      expect(retrievedData).toEqual(encryptedData);

      // Second GET should return 404
      const req2 = new Request(`http://localhost/n/${id}/data`);
      const res2 = await app.request(req2);

      expect(res2.status).toBe(404);
      const body = await res2.json();
      expect(body.error).toContain('already viewed');
    });

    it('should return 404 for non-existent notes', async () => {
      const app = createApp(storage);
      // Use a valid UUID v4 format that doesn't exist
      const nonExistentId = '12345678-1234-4123-8123-123456789abc';
      const req = new Request(`http://localhost/n/${nonExistentId}/data`);
      const res = await app.request(req);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain('not found');
    });

    it('should reject invalid ID format', async () => {
      const app = createApp(storage);
      const req = new Request('http://localhost/n/invalid@id!/data');
      const res = await app.request(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid ID format');
    });
  });

  describe('GET /n/:id', () => {
    it('should serve HTML decryption page', async () => {
      const app = createApp(storage);
      // Store a note first
      const { encrypted } = await encryptNote('Test');
      const encryptedData = Buffer.from(JSON.stringify(encrypted));

      const postRes = await app.request(new Request('http://localhost/n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: encryptedData,
      }));
      const { id } = await postRes.json();

      const req = new Request(`http://localhost/n/${id}`);
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    });
  });

  describe('One-time read guarantee', () => {
    it('should delete note after first read', async () => {
      const app = createApp(storage);
      // Store a note
      const { encrypted } = await encryptNote('One-time read test');
      const encryptedData = Buffer.from(JSON.stringify(encrypted));

      const postRes = await app.request(new Request('http://localhost/n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: encryptedData,
      }));
      const { id } = await postRes.json();

      // Verify it was stored
      expect(await storage.exists(id)).toBe(true);

      // First read should succeed
      const res1 = await app.request(new Request(`http://localhost/n/${id}/data`));
      expect(res1.status).toBe(200);

      // Note should be deleted now
      expect(await storage.exists(id)).toBe(false);

      // Second read should fail
      const res2 = await app.request(new Request(`http://localhost/n/${id}/data`));
      expect(res2.status).toBe(404);
    });
  });
});
