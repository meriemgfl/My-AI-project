import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    proxy: {
      '/api': mode === 'demo' ? 'http://localhost:3002' : 'http://localhost:3001',
    },
  },
}));
