/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JUSSIMATIC_BACKEND_API_BASE_URL: string;
  readonly VITE_JUSSILOG_BACKEND_API_BASE_URL: string;
  readonly VITE_ECOMMERCE_MAIN_TITLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
