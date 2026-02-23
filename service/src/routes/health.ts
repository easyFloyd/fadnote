import { Hono } from 'hono';
import { Variables, STORAGE_TYPE } from '../utils/env.js';

const app = new Hono<{ Variables: Variables }>();

type HealthResponse = {
  status: string;
  storage: {
    type: string;
    status: string;
    error?: string;
  };
  timestamp: string;
};

app.get('/', async (c) => {
  try {
    const storage = c.get('storage');

    const healthData: HealthResponse = {
      status: 'ok',
      storage: {
        type: STORAGE_TYPE,
        status: 'initialized',
      },
      timestamp: new Date().toISOString(),
    };

    // Test storage connectivity
    try {
      await storage.ping();
      healthData.storage.status = 'connected';
    } catch (error: any) {
      healthData.storage.status = 'error';
      healthData.storage.error = error.message;
      return c.json(healthData, 503);
    }

    return c.json(healthData);
  } catch (error: any) {
    return c.json({ status: 'error', error: error.message }, 500);
  }
});

export const healthRoute = app;
