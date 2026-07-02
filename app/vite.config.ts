/// <reference types="vitest/config" />
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

const PORT = 5180;

// The browser can't discover the machine's LAN address, so we bake it in
// at server start — the desktop page renders it as a QR code for the phone.
function detectLanUrl(): string | null {
  const addresses: string[] = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const info of interfaces ?? []) {
      if (info.family === 'IPv4' && !info.internal) addresses.push(info.address);
    }
  }
  const preferred =
    addresses.find((a) => a.startsWith('192.168.')) ??
    addresses.find((a) => a.startsWith('10.')) ??
    addresses[0];
  return preferred ? `https://${preferred}:${PORT}` : null;
}

// HTTPS is required: WebXR only runs in a secure context. On the phone,
// either accept the self-signed certificate warning once, or use
// `adb reverse tcp:5180 tcp:5180` and open https://localhost:5180.
export default defineConfig({
  plugins: [basicSsl()],
  define: {
    __LAN_URL__: JSON.stringify(detectLanUrl()),
  },
  optimizeDeps: {
    // Worker-only deps are discovered lazily at runtime; without
    // pre-bundling, Vite's mid-session re-optimization reloads the page
    // and aborts an in-flight model load.
    include: ['rhino3dm', 'occt-import-js'],
  },
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
    port: PORT,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
  },
});
