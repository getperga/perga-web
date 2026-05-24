import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import '@/index.css';
import { initConfig } from '@/config';
import { initTheme } from '@common/utils/theme';

registerSW();

initConfig().then(async () => {
  initTheme();

  const { default: App } = await import('./App');

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
