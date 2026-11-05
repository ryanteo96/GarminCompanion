import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { apiPlugin } from './tools/api-plugin.js';

export default defineConfig({
  plugins: [react(), apiPlugin()],
  test: { include: ['tests/**/*.test.ts'] },
});
