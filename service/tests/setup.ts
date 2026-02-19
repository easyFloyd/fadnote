// Test setup configuration
import { afterAll, beforeAll } from 'vitest';

beforeAll(() => {
  // Set test environment variables
  process.env.STORAGE_TYPE = 'filesystem';
  process.env.FS_STORAGE_PATH = './test-data/notes';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
});

afterAll(async () => {
  // Cleanup test data if needed
  // Note: Test files are cleaned up individually in each test
});
