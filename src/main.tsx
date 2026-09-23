import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/gowun-dodum/400.css'
import '@/styles/globals.css'
import { App } from '@/app/app'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
