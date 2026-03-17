import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_APP_TITLE = 'Jussimatic - Portfolio by Jussi Alanen';
const DEFAULT_APP_DESCRIPTION = 'Jussimatic is the main portfolio by Jussi Alanen, including project references and live demos such as CV Review tool, CV Chat, Browse Jobs and Ecommerce.';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appTitle = env.VITE_APP_TITLE || DEFAULT_APP_TITLE;
  const appDescription = env.VITE_APP_DESCRIPTION || DEFAULT_APP_DESCRIPTION;

  return {
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
    optimizeDeps: {
      include: ['country-flag-icons/react/3x2'],
    },
    plugins: [
      react(),
      {
        name: 'html-inject-meta',
        transformIndexHtml(html) {
          return html
            .replace(/%APP_TITLE%/g, appTitle)
            .replace(/%APP_DESCRIPTION%/g, appDescription);
        },
      },
    ],
  };
})
