import { startServer } from './server.js';

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
