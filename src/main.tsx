import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import App from './App.tsx'
import { hydrateAll } from './state/hydrate.ts'
import { registerFlushOnHide } from './state/flush.ts'

await hydrateAll()
registerFlushOnHide()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
