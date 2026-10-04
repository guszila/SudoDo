import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Clean up any stale PWA service worker during development to avoid caching/MIME interception
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// Automatically recover when Vite fails to preload dynamic import chunks after a new deployment
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Preload error detected for chunk, refreshing page:', event);
  const reloadKey = 'vite_preload_auto_reload';
  const lastReload = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
  if (Date.now() - lastReload > 10000) {
    sessionStorage.setItem(reloadKey, Date.now().toString());
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

