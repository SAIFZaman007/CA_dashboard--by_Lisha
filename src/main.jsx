import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'

import App from './App.jsx'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { queryClient } from '@/lib/queryClient'
import './index.css'

const rootFallback = (
  <div
    role="alert"
    style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      padding: '2rem',
      textAlign: 'center',
      background: '#0b0b0d',
      color: '#d6d6dc',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    }}
  >
    <h1 style={{ fontSize: '1.5rem', color: '#ffffff', margin: 0 }}>
      The dashboard could not start
    </h1>
    <p style={{ maxWidth: '30rem', lineHeight: 1.6, margin: 0, color: '#9a9aa4' }}>
      Reloading usually clears this. If it persists after a reload, the deployment may still be
      coming up — wait a minute and try again.
    </p>
    <a
      href="/"
      style={{
        background: '#e5202c',
        color: '#fff',
        padding: '0.7rem 1.5rem',
        borderRadius: '0.375rem',
        textDecoration: 'none',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontSize: '0.75rem',
      }}
    >
      Reload
    </a>
  </div>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary fallback={rootFallback}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)