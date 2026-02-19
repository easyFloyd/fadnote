import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/index';
import { createStorage } from '../src/storage/factory';

describe('Health Check', () => {
  let storage: any;

  beforeAll(async () => {
    storage = await createStorage('filesystem');
  });

  describe('GET /health', () => {
    it('should return 200 with health status', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.request(req, {
        env: { STORAGE: storage }
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('storage');
      expect(body.storage).toHaveProperty('type');
      expect(body.storage).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
    });

    it('should show filesystem storage as accessible', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.request(req, {
        env: { STORAGE: storage }
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.storage.type).toBe('filesystem');
      expect(body.storage.status).toBe('accessible');
    });

    it('should return 503 if storage is not available', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.request(req, {
        env: {}
      });

      expect(res.status).toBe(503);

      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.storage.status).toBe('error');
      expect(body.storage).toHaveProperty('error');
      expect(body.storage.error).toContain('not initialized');
    });
  });
});
