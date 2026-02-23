// Test setup configuration
import { beforeAll } from 'vitest';

beforeAll(() => {
  // Set test environment variables
  process.env.STORAGE_TYPE = 'filesystem';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
});
