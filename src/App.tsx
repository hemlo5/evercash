import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useApi } from "@/contexts/HybridApiContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SimpleCurrencyProvider } from "@/contexts/SimpleCurrencyContext";
import { UserProvider } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import OnboardingModal from "@/components/OnboardingModal";
import { MobileNavButton } from "@/components/MobileNav";
import { BottomNavigation } from "@/components/BottomNavigation";
import { getOnboardingData } from "@/lib/supabase-client";
import { AuthCallback } from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Budgets from "./pages/BudgetsTest";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Goals from "./pages/Goals";
import Import from "./pages/Import";
import BankSync from "./pages/BankSync";
import Sharing from "./pages/Sharing";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import Logout from "./pages/Logout";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Authenticated App Component
function AuthenticatedApp() {
  const { api, loading, isAuthenticated, retryConnection } = useApi();
  const { user, profile, loading: authLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('actual-token');

  // When token appears (after Google sign-in), ensure API session re-initializes
  useEffect(() => {
    if (hasToken && !isAuthenticated) {
      retryConnection();
    }
  }, [hasToken, isAuthenticated, retryConnection]);

  useEffect(() => {
    if (profile && !profile.onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [profile]);

  // Show loading state (only while API initializes)
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Connecting...</p>
        </div>
      </div>
    );
  }

  // Show error state if can't connect to server
  if (!loading && !api) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-4 text-center">
        <div className="mb-4 rounded-full bg-red-100 p-3">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold">Cannot Connect to Actual Budget</h2>
        <p className="mb-4 text-muted-foreground max-w-md">
          Please ensure the Actual Budget server is running on port 5006.
        </p>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Run this command to start the server:
          </p>
          <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm">
            yarn start:server-dev
          </code>
        </div>
        <button
          onClick={retryConnection}
          className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // If no server token, show landing page (treat as logged out)
  if (!hasToken) {
    return <Landing />;
  }

  // Fallback: if API isn't authenticated yet, show a short connecting state
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Finalizing sign-in…</p>
        </div>
      </div>
    );
  }

  // Helper inside Router to hide hamburger on Dashboard (now included in Dashboard header)
  const MobileButtonConditional = () => {
    const location = useLocation();
    if (location.pathname === "/") {
      // On Dashboard, hamburger is included in the header directly
      return null;
    }
    return (
      <div className="fixed top-4 right-4 z-30 md:hidden">
        <MobileNavButton />
      </div>
    );
  };

  // Show main app if authenticated
  return (
    <BrowserRouter>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar className="hidden md:flex" />
          
          {/* Global Mobile Navigation Button (hidden on Dashboard) */}
          <MobileButtonConditional />
          
          <main className="flex-1 overflow-auto pb-16 md:pb-0">
            <Routes>
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/import" element={<Import />} />
              <Route path="/bank-sync" element={<BankSync />} />
              <Route path="/sharing" element={<Sharing />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>

            {/* Onboarding modal to collect QnA and save to Supabase */}
            <OnboardingModal
              open={showOnboarding}
              onOpenChange={setShowOnboarding}
              onComplete={async () => {
                try {
                  if (!api || !user) return;
                  // Bootstrap basic budget and a goal from onboarding data
                  const data = await getOnboardingData(user.id);
                  if (!data) return;

                  // Create categories and set current month budgets
                  const existingCats = await api.getCategories();
                  const now = new Date();
                  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                  for (const item of data.expense_categories || []) {
                    const exists = (existingCats || []).find(
                      (c: any) => (c.name || '').toLowerCase() === (item.category || '').toLowerCase()
                    );
                    let catId = exists?.id;
                    if (!catId) {
                      catId = await api.createCategory({ name: item.category, is_income: false, sort_order: 999 });
                    }
                    // Budget amount expects cents
                    const amountCents = Math.round((item.amount || 0) * 100);
                    if (amountCents > 0) {
                      try { await api.setBudgetAmount(catId, month, amountCents); } catch {}
                    }
                  }

                  // Create initial goal from savings
                  const goalName = data.savings_goal || data.custom_goal || 'Starter Goal';
                  const targetCents = Math.round((data.goal_amount || 0) * 100);
                  if (goalName && targetCents > 0) {
                    try {
                      await api.createGoal({ name: goalName, target_amount: targetCents, current_amount: 0, target_date: null });
                    } catch {}
                  }
                } catch (e) {
                  // silent bootstrap errors
                }
              }}
            />
          </main>
          
          {/* Mobile Bottom Navigation */}
          <BottomNavigation />
        </div>
      </SidebarProvider>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <SimpleCurrencyProvider>
        <UserProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AuthenticatedApp />
          </TooltipProvider>
        </UserProvider>
      </SimpleCurrencyProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
