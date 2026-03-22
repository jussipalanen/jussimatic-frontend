/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JUSSIMATIC_BACKEND_API_BASE_URL: string;
  readonly VITE_JUSSILOG_BACKEND_API_BASE_URL: string;
  readonly VITE_JUSSI_AIBOT_API_URL: string;
  readonly VITE_JUSSI_AIBOT_AI_SECRET_KEY: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_ECOMMERCE_MAIN_TITLE?: string;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_APP_DESCRIPTION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
}

interface GoogleButtonConfiguration {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
}

interface GoogleAccounts {
  id: GoogleAccountsId;
}

interface GoogleNamespace {
  accounts: GoogleAccounts;
}

interface Window {
  google?: GoogleNamespace;
}
