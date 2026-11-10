import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site at https://<user>.github.io/ic-companion/
export default defineConfig({
  base: '/ic-companion/',
  plugins: [react()],
  test: { environment: 'node' },
});
