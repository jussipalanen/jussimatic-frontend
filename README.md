# Jussimatic

A modern frontend portfolio application powered by React, TypeScript, and Vite. This project showcases multiple functionalities including an e-commerce platform and AI-powered chat capabilities, demonstrating full-stack integration with backend services.

## Features

- 🛒 **E-commerce Demo**: Integrated with Laravel PHP backend for product management, cart functionality, and order processing
- 🤖 **AI-Powered Chat**: Real-time chat interface powered by Node.js backend
- 📄 **Resume Builder Demo**: Create and export resumes (PDF/HTML) without an account; choose template and theme, fill in all sections, and export directly from the browser
- 👤 **Resume Management**: Authenticated users can create, edit, and manage multiple resumes from their profile (`/profile/resumes`)
- ⚡ **Modern Stack**: Built with React 18, TypeScript, and Vite for optimal development experience and performance
- 📱 **Responsive Design**: Fully responsive UI with Tailwind CSS
- 🌍 **Multi-language Support**: Internationalization (i18n) with English and Finnish

## Technology Stack

- ⚛️ **Frontend**: React 18, TypeScript, Vite
- 🎨 **Styling**: Tailwind CSS
- 🔌 **Backend Integration**: 
  - 🐘 Laravel PHP (E-commerce)
  - 🟢 Node.js (AI Chat)
- 🚀 **Build Tool**: Vite with HMR (Hot Module Replacement)

## Development

This project includes a `dev` script to simplify common development tasks.

### Usage

```bash
./dev [COMMAND]
```

### Available Commands

- `up` - Start Docker Compose development environment
- `rebuild` - Rebuild and restart Docker Compose (detached, force-recreate)
- `down` - Stop Docker Compose
- `logs` - Show Docker Compose logs
- `build` - Build Docker image
- `restart` - Restart Docker Compose
- `local` - Start local development (default, runs without Docker)

### Examples

```bash
# Start local development server
./dev

# Start with Docker Compose
./dev up

# Rebuild containers with latest changes
./dev rebuild

# View logs
./dev logs
```

## Environment Variables

Copy `.env.example` to `.env.local` and set the API base URLs:

```dotenv
VITE_JUSSIMATIC_BACKEND_API_BASE_URL=https://your-api-url-here
VITE_JUSSILOG_BACKEND_API_BASE_URL=http://localhost:8000/api/
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
