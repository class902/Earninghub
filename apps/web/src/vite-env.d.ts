/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the EarningHub API (Cloudflare Worker), e.g. https://earninghub-api.<account>.workers.dev */
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
