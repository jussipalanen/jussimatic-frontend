import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './dark-theme.css'
import './light-theme.css'
import App from './App.tsx'
import { APP_TITLE } from './constants'

document.title = APP_TITLE

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
