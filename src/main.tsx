import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './lib/AuthContext';
import AuthGate from './components/AuthGate';
import RegionEditRoot from './components/RegionEditRoot';
import UiSkin from './components/UiSkin';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <UiSkin />
        <App />
        <RegionEditRoot />
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed', err);
    });
  });
}
