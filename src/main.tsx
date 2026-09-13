import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { AppStore } from './store/Store';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppStore>
        <HashRouter>
          <App />
        </HashRouter>
      </AppStore>
    </ErrorBoundary>
  </StrictMode>,
);
