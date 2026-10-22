import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Dev: FE gọi /api cùng origin, Vite chuyển tiếp sang backend local nên không cần CORS.
  server: { proxy: { '/api': 'http://127.0.0.1:3100' } },
});
