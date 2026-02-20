import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/index';
import { createStorage } from '../src/storage/factory';
import fs from 'fs/promises';

describe('Health Check', () => {
  let storage: any;

  beforeAll(async () => {
    storage = await createStorage('filesystem');
    // Ensure data directory exists for health check
    await fs.mkdir('./data/notes', { recursive: true }).catch(() => {});
  });

  describe('GET /health', () => {
    it('should return 200 with health status', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.request(req);

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('storage');
      expect(body.storage).toHaveProperty('type');
      expect(body.storage).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
    });

    it('should return 200 even when storage not in context (tests)', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.request(req);

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.storage.type).toBe('filesystem');
      // Status will be 'unknown' since storage is not in context in tests
      expect(['unknown', 'accessible']).toContain(body.storage.status);
    });

    it('should show storage as accessible when available', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.request(req, {
        env: { STORAGE: storage }
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.storage.type).toBe('filesystem');
      expect(body.storage.status).toBe('accessible');
    });
  });
});
