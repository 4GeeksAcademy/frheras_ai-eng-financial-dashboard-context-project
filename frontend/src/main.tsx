import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { reportWebVitals } from './lib/report-web-vitals'

// RUM nativo sin dependencias (perf GUARD): mide LCP/INP/CLS/FCP.
reportWebVitals(import.meta.env.PROD)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
