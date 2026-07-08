import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      AUTH_CREDENTIALS: 'test:test',
      JWT_SECRET: 'test-secret-key-for-testing-only',
      NODE_ENV: 'development',
    },
  },
});
