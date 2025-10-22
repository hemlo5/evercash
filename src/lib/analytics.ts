declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const GA_ID = (import.meta as any).env?.VITE_GA_ID || 'G-B7CDVJJM7N';

export function initAnalytics() {
  if (typeof window === 'undefined' || !GA_ID) return;
  if (window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments as any); } as any;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { cookie_domain: 'evercash.in', send_page_view: false });
}

export function trackPageview(path: string) {
  if (typeof window === 'undefined' || !GA_ID) return;
  window.gtag?.('event', 'page_view', { page_path: path });
}

export function trackEvent(name: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !GA_ID) return;
  window.gtag?.('event', name, params || {});
}
