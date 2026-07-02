/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS is required: WebXR only runs in a secure context. On the phone,
// either accept the self-signed certificate warning once, or use
// `adb reverse tcp:5180 tcp:5180` and open https://localhost:5180.
export default defineConfig({
  plugins: [basicSsl()],
  resolve: {
    alias: {
      // rhino3dm's emscripten loader has Node-only branches; stub the
      // Node built-ins it references so the browser bundle resolves.
      ws: fileURLToPath(new URL('./src/shims/empty.js', import.meta.url)),
    },
  },
  server: {
    host: true,
    // 5173 is taken by another project on this machine; strictPort keeps
    // the phone URL and the Playwright baseURL reliable.
    port: 5180,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
  },
});
