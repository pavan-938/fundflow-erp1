import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    setupFiles: ['tests/setup.ts'],
    globalTeardown: ['tests/globalTeardown.ts'],
  },
});
