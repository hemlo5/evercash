import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function Landing() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState<'signin' | 'signup' | null>(null);

  const handleSignIn = async () => {
    try {
      setLoading('signin');
      await signInWithGoogle();
    } finally {
      setLoading(null);
    }
  };

  const handleSignUp = async () => {
    try {
      localStorage.setItem('intendedAction', 'signup');
      setLoading('signup');
      await signInWithGoogle();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">EC</span>
          </div>
          <CardTitle className="text-3xl font-extrabold">EVERCASH</CardTitle>
          <CardDescription>Smart budget management with AI-powered insights</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-muted-foreground">
            <p>Start by signing in to your account. New here? Sign up and we'll guide you through a quick onboarding to set up your budget and first goal.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              className="h-12 sm:col-span-1"
              onClick={() => {
                const appUrl = import.meta.env.VITE_PUBLIC_APP_URL || 'https://app.evercash.in';
                window.location.href = appUrl;
              }}
              disabled={loading !== null}
            >
              {loading === 'signin' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Going to App
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Go to App
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="h-12 sm:col-span-1"
              onClick={handleSignIn}
              disabled={loading !== null}
            >
              {loading === 'signin' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              className="h-12 sm:col-span-1"
              onClick={handleSignUp}
              disabled={loading !== null}
            >
              {loading === 'signup' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Creating your account...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign up with Google
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
