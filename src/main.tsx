import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

// StrictMode intentionally omitted — it double-invokes effects in dev, which
// causes two PixiJS Applications to race for the same WebGL canvas context.
createRoot(rootElement).render(<App />)
