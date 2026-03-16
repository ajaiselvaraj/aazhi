// tests/setup.ts
// This file is executed before each test file.
// You can use it for global setup, like mocking, or cleaning up resources.
import { pool } from '../config/db';

afterAll(async () => {
  // Close the database connection pool after all tests have run
  // to prevent Jest from hanging.
  await pool.end();
});
