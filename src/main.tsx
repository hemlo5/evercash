import React from 'react';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { ApiProvider } from '@/contexts/HybridApiContext';
import { AuthProvider } from '@/contexts/AuthContext';
import App from './App';
import './index.css';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApiProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ApiProvider>
  </StrictMode>
);
