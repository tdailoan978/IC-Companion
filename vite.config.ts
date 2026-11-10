import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Shown in the Home footer so a new deploy is easy to spot on the iPad.
// The app formats the ISO time in the device's own time zone.
const BUILD_INFO = {
  time: new Date().toISOString(),
  commit: (process.env.GITHUB_SHA ?? '').slice(0, 7),
};

// GitHub Pages serves the site at https://<user>.github.io/ic-companion/
export default defineConfig({
  base: '/ic-companion/',
  plugins: [react()],
  define: {
    __BUILD_INFO__: JSON.stringify(BUILD_INFO),
  },
  build: {
    // The lesson bundle (src/generated/lessons.json) is compiled into the main
    // chunk on purpose: one file to cache, everything available offline.
    chunkSizeWarningLimit: 900,
  },
  test: { environment: 'node' },
});
