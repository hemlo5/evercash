import React from 'react';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { ApiProvider } from '@/contexts/HybridApiContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { initAnalytics, startEngagementTracking, trackPageView } from '@/lib/analytics';
import App from './App';
import './index.css';

initAnalytics();
startEngagementTracking();
trackPageView(window.location.pathname, document.title);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApiProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ApiProvider>
  </StrictMode>
);
