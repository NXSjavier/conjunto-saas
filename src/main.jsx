import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerPwa, isPwaInstalled, pingServiceWorker, onBeforeInstallPrompt } from './pwa';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { installGlobalErrorHandlers } from './lib/errorLog';

installGlobalErrorHandlers();

let installEvent = null;
onBeforeInstallPrompt((e) => {
  installEvent = e;
});

window.addEventListener('beforeinstallprompt', (e) => {
  installEvent = e;
  try { e.preventDefault(); } catch {}
}, { once: false });

window.addEventListener('appinstalled', () => {
  installEvent = null;
});

async function initApp() {
  try {
    console.log('🚀 Iniciando aplicación...');

    const registration = await registerPwa();
    
    if (registration) {
      console.log('✅ PWA registrada correctamente');
      
      if (isPwaInstalled()) {
        console.log('📱 App instalada como PWA');
        
        setTimeout(async () => {
          const ping = await pingServiceWorker();
          if (ping) {
            console.log('✅ SW responde correctamente:', ping);
          } else {
            console.warn('⚠️ SW no responde');
          }
        }, 3000);
      } else {
        console.log('🌐 App abierta en navegador (no instalada)');
      }
    } else {
      console.warn('⚠️ PWA no registrada');
    }
  } catch (error) {
    console.error('❌ Error inicializando PWA:', error);
  }

  const root = document.getElementById('root');
  if (root) {
    createRoot(root).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  }
}

initApp();