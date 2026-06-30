import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initSentry } from './services/sentry'
import App from './App'
import './index.css'

// Initialize Sentry error tracking
initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
