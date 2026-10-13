import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// In dev the API and uploads are proxied to the Express server, so the browser only ever talks
// to one origin (cookies and sendBeacon behave exactly as in production).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');
  const target = `http://localhost:${env.PORT || 4000}`;
  return {
    envDir: '..',
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': target, '/uploads': target, '/sitemap.xml': target, '/robots.txt': target },
    },
    build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 700 },
  };
});
