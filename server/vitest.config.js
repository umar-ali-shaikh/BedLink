import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.js', 'tests/**/*.test.js'],
    setupFiles: ['tests/helpers/setupEnv.js'],
    pool: 'forks',
    // Each integration file boots its own in-memory replica set; keep them sequential.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
