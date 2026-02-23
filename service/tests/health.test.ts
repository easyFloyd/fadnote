import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app';
import { InMemoryStorage } from './utils/in-memory-storage';

describe('Health Check', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  describe('GET /health', () => {
    it('should return 200 with health status', async () => {
      const app = createApp(storage);
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

    it('should show storage as connected when available', async () => {
      const app = createApp(storage);
      const req = new Request('http://localhost/health');
      const res = await app.request(req);

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.storage.status).toBe('connected');
    });
  });
});
