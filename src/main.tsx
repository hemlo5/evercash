import React from 'react';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { ApiProvider } from '@/contexts/ApiContext';
import App from './App';
import './index.css';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApiProvider>
      <App />
    </ApiProvider>
  </StrictMode>
);
