import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase-client';

export default function Logout() {
  const { signOut } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        // Clear server token immediately to avoid stale identity
        try { localStorage.removeItem('actual-token'); } catch {}
        try {
          // Clear Supabase auth tokens stored in localStorage (sb-<ref>-auth-token)
          const keys = Object.keys(localStorage);
          keys.forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k); });
        } catch {}

        // Race Supabase signOut with a timeout so UI never hangs
        const timeout = new Promise((_res, rej) => setTimeout(() => rej(new Error('signOut timeout')), 2000));
        await Promise.race([
          (async () => {
            try { await signOut(); } catch {}
            try { await supabase.auth.signOut({ scope: 'global' } as any); } catch {}
          })(),
          timeout
        ]).catch(() => {});
      } finally {
        // Force hard redirect to Landing regardless of signOut result
        window.location.replace('/');
      }
    })();
  }, [signOut]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
        <p>Signing you out...</p>
      </div>
    </div>
  );
}
