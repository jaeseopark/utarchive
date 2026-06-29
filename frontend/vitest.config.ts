import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      all: true,
      include: ['src/pages/**/*.{ts,tsx}'],
      exclude: ['src/setupTests.ts', 'src/main.tsx'],
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
});
