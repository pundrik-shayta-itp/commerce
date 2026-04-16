import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { CommerceProvider } from './context/CommerceContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CommerceProvider>
        <App />
      </CommerceProvider>
    </BrowserRouter>
  </StrictMode>,
)
