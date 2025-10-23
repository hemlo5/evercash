const MEASUREMENT_ID: string = (import.meta as any)?.env?.VITE_GA_MEASUREMENT_ID || 'G-STQNZ970WF';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

function injectGtagScript(id: string) {
  if (document.getElementById('ga4-gtag')) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.id = 'ga4-gtag';
  document.head.appendChild(script);
}

export function initAnalytics(measurementId: string = MEASUREMENT_ID) {
  if (!measurementId || typeof document === 'undefined') return;
  injectGtagScript(measurementId);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  } as any;
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });
}

export function trackPageView(path: string, title?: string) {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
      page_location: window.location.href,
    });
  } catch (e) {
  }
}

export function trackEvent(name: string, params?: Record<string, any>) {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    window.gtag('event', name, params || {});
  } catch (e) {
  }
}
export function startEngagementTracking() {
  if (typeof document === 'undefined') return;
  let lastTs = performance.now();
  let intervalId: number | null = null;
  const flush = () => {
    if (typeof window.gtag !== 'function') return;
    const now = performance.now();
    const delta = Math.max(0, now - lastTs);
    lastTs = now;
    if (delta > 0) {
      window.gtag('event', 'user_engagement', { engagement_time_msec: Math.round(delta) });
    }
  };
  const start = () => {
    if (intervalId != null) return;
    lastTs = performance.now();
    intervalId = window.setInterval(flush, 30000);
  };
  const stop = () => {
    if (intervalId == null) return;
    flush();
    clearInterval(intervalId);
    intervalId = null;
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') start();
    else stop();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('beforeunload', stop);
  if (document.visibilityState === 'visible') start();
}
