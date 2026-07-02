declare module '*.wasm?url' {
  const url: string;
  export default url;
}

/** LAN URL of the dev/preview server, baked in by vite.config.ts (define). */
declare const __LAN_URL__: string | null;
