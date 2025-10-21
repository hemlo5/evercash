import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, PiggyBank, Plus, Zap, Target, Loader2, Globe, Link2, Upload } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { NetWorthCircle } from "@/components/NetWorthCircle";
import { TransactionItem } from "@/components/TransactionItem";
import { AIInsightBadge } from "@/components/AIInsightBadge";
import { AIReportBanner } from "@/components/AIReportBanner";
import { DashboardWidget } from "@/components/DashboardWidget";
import { QuickAddTransaction } from "@/components/QuickAddTransaction";
import { BankSyncModal } from "@/components/BankSyncModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/contexts/HybridApiContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSimpleCurrency } from "@/contexts/SimpleCurrencyContext";
import { useUser } from "@/contexts/UserContext";
import { generateAIInsights, type AIInsight } from "@/lib/ai-insights";
// Removed CurrencySelector and ThemeToggle from dashboard header
import { toast } from "sonner";
import type { Account as ApiAccount, Transaction as ApiTransaction } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { CurrencySelector } from "@/components/CurrencySelector";
import { MobileNavButton } from "@/components/MobileNav";

interface BudgetData {
  incomeMonth: number;
  expenseMonth: number;
  balance: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [netWorthTarget, setNetWorthTarget] = useState(() => {
    const stored = localStorage.getItem('netWorthTarget');
    return stored ? Number(stored) : 60000;
  });
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(netWorthTarget.toString());
  const [bankSyncOpen, setBankSyncOpen] = useState(false);
  const { api, loading } = useApi();
  const { theme } = useTheme();
  const { currentCurrency, setCurrency, formatAmount } = useSimpleCurrency();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [surplusDeficit, setSurplusDeficit] = useState(0);
  const { user } = useUser();

  useEffect(() => {
    // Add delay to prevent rate limiting
    const timer = setTimeout(() => {
      fetchData();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Refresh when other pages modify transactions (e.g., goals allocation)
  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('transactions-updated', handler);
    return () => window.removeEventListener('transactions-updated', handler);
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
        // Get current month string
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const currentYear = now.getFullYear();
        const currentMonthNum = now.getMonth() + 1;

        // Fetch all required data in parallel
        const [accountsData, budgetMonth, allTransactions, goalsData] = await Promise.all([
          api.getAccounts(),
          api.getBudgetMonth(currentMonth),
          api.getTransactions(), // Get all transactions, then filter
          api.getGoals() // Fetch user's goals
        ]);

        setAccounts(accountsData);
        setTransactions(allTransactions);
        setGoals(goalsData || []);
        
        console.log('🎯 Goals loaded:', goalsData);

        // Calculate totals from all transactions (same as Reports page)
        let totalIncome = 0;
        let totalExpenses = 0;

        console.log('🔍 DEBUGGING DASHBOARD CALCULATIONS (All Transactions)');
        console.log('📊 All transactions:', allTransactions.length);
        
        allTransactions.forEach(transaction => {
          const amountInDollars = transaction.amount || 0;
          
          console.log('💰 Transaction:', {
            date: transaction.date,
            amount: amountInDollars,
            payee: transaction.payee
          });
          
          // Count all transactions (same as Reports page)
          if (amountInDollars > 0) {
            totalIncome += amountInDollars;
          } else if (amountInDollars < 0) {
            totalExpenses += Math.abs(amountInDollars);
          }
        });

        console.log('📊 ALL TRANSACTIONS TOTALS - Income:', totalIncome, 'Expenses:', totalExpenses);

        // Calculate surplus/deficit
        const surplus = totalIncome - totalExpenses;
        setSurplusDeficit(surplus);
        console.log('💰 SURPLUS/DEFICIT:', surplus);

        setBudgetData({
          incomeMonth: totalIncome,
          expenseMonth: totalExpenses,
          balance: totalIncome - totalExpenses
        });

        // Generate AI insights based on transaction data
        const insights = generateAIInsights(allTransactions, {
          income: totalIncome,
          expense: totalExpenses,
        });
        setAiInsights(insights);

      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

  // Show loading state
  if (loading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading your financial data...</span>
      </div>
    );
  }

  // Show error state
  if (!loading && !api) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-4 text-center">
        <div className="mb-4 rounded-full bg-red-100 p-3">
          <Zap className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Failed to load data</h2>
        <p className="mb-4 text-muted-foreground">
          Unable to connect to the server
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  // Note: formatCurrency is now imported from @/lib/currency

  // Map transactions to match TransactionItem component's expected props
  const mappedTransactions = transactions.map(tx => ({
    ...tx,
    merchant: tx.payee,  // Map payee to merchant
    key: tx.id,          // Use the transaction ID as the React key
  }));

  // Derived values (fallback to 0 while loading)
  const monthlyIncome = budgetData?.incomeMonth ?? 0;
  const monthlyExpenses = budgetData?.expenseMonth ?? 0;
  const savingsRateNum = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  const netWorth = ((accounts || [])
    .filter((a: any) => !a.closed)
    .reduce((sum: number, a: any) => sum + (a.balance ?? 0), 0)) || 0;

  // Get the 5 most recent transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Filter transactions for last 30 days (same as the totals calculation)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const last30DaysTransactions = transactions.filter(tx => {
    const transactionDate = new Date(tx.date!);
    return transactionDate >= thirtyDaysAgo;
  });

  // Note: keep small insight items limited to top 3 from AI engine

  // Import Summary: prefer latest import stats if available
  let summaryTransactions = last30DaysTransactions;
  let summaryLabel = 'Transactions (30 days)';
  try {
    const savedHistoryRaw = localStorage.getItem('import-history');
    if (savedHistoryRaw) {
      const history = JSON.parse(savedHistoryRaw);
      if (Array.isArray(history) && history.length > 0) {
        const latest = history[0];
        if (latest?.fileName) {
          const marker = `Imported from ${latest.fileName}`;
          const importedTxs = transactions.filter(t => (t.notes || '').includes(marker));
          if (importedTxs.length > 0) {
            summaryTransactions = importedTxs;
            summaryLabel = 'Transactions (Last Import)';
          }
        }
      }
    }
  } catch (e) {
    // ignore parse errors, fallback to last 30 days
  }


  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in">
      {/* Top header bar */}
      <div className={`rounded-none border-b border-border px-4 py-3 md:px-8 md:py-4 shadow-sm mx-[-1rem] md:mx-[-2rem] mt-[-1rem] md:mt-[-2rem] ${
        theme === 'dark' ? 'bg-black' : 'bg-white'
      }`}>
        {/* Mobile: brand + controls (same row) */}
        <div className="md:hidden flex items-center justify-between">
          <h1 className={`font-extrabold tracking-tight text-xl sm:text-2xl flex-shrink-0 ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent'
          }`}>EVERCASH</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={() => navigate('/import')}
              className={`font-semibold text-xs px-2 py-2 whitespace-nowrap flex-shrink-0 ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 text-black shadow-[0_0_12px_rgba(0,255,0,0.35)]'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.25)]'
              }`}
            >
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Import
            </Button>
            <div className="md:hidden">
              <MobileNavButton />
            </div>
          </div>
        </div>
        {/* Desktop: brand left, controls right */}
        <div className="hidden md:flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-emerald-400 dark:from-green-400 dark:to-green-300 bg-clip-text text-transparent">EVERCASH</h1>
          <div className="flex items-center gap-3">
            <CurrencySelector
              value={currentCurrency}
              onChange={setCurrency}
              showIcon={true}
            />
            <Button
              onClick={() => navigate('/import')}
              className={`font-semibold text-sm md:text-base px-3 md:px-4 py-2 ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 text-black shadow-[0_0_12px_rgba(0,255,0,0.35)]'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.25)]'
              }`}
            >
              <Upload className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Import Transactions</span>
              <span className="sm:hidden">Import</span>
            </Button>
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="flex flex-wrap gap-2 md:gap-3 items-center animate-fade-in-up">
        <AIReportBanner 
          transactions={transactions} 
          monthlyIncome={monthlyIncome} 
          monthlyExpenses={monthlyExpenses} 
        />
        {aiInsights.slice(0, 3).map((insight, index) => (
          <AIInsightBadge
            key={index}
            type={insight.type}
            message={insight.message}
            detail={insight.detail}
          />
        ))}
      </div>

      {/* Mobile Layout: Income + Expenses side by side, Savings Rate below */}
      <div className="md:hidden space-y-4">
        {/* First row: Income and Expenses side by side */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Monthly Income"
            value={formatAmount(monthlyIncome)}
            icon={DollarSign}
            contributors={(() => {
              // Top 3 income sources by payee (all transactions)
              const incomeTxs = transactions.filter(tx => (tx.amount || 0) > 0);
              const byPayee: Record<string, number> = {};
              incomeTxs.forEach(tx => {
                const name = tx.payee || 'Other';
                byPayee[name] = (byPayee[name] || 0) + tx.amount;
              });
              return Object.entries(byPayee)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, value]) => ({ name, value: formatAmount(value) }));
            })()}
          />
          <StatCard
            title="Monthly Expenses"
            value={formatAmount(monthlyExpenses)}
            icon={TrendingUp}
            contributors={(() => {
              // Top 3 expense destinations by payee (all transactions)
              const expenseTxs = transactions.filter(tx => (tx.amount || 0) < 0);
              const byPayee: Record<string, number> = {};
              expenseTxs.forEach(tx => {
                const name = tx.payee || 'Other';
                byPayee[name] = (byPayee[name] || 0) + Math.abs(tx.amount);
              });
              return Object.entries(byPayee)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, value]) => ({ name, value: formatAmount(value) }));
            })()}
          />
        </div>
        
        {/* Second row: Savings Rate full width */}
        <StatCard
          title="Savings Rate"
          value={`${savingsRateNum.toFixed(1)}%`}
          icon={PiggyBank}
          contributors={(() => {
            // Top 3 categories by net positive (income - expense) (all transactions)
            const byCategory: Record<string, number> = {};
            transactions.forEach(tx => {
              const cat = tx.category || 'Other';
              byCategory[cat] = (byCategory[cat] || 0) + tx.amount;
            });
            return Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([name, value]) => ({ name, value: formatAmount(value) }));
          })()}
        />
        
        {/* NetWorth Circle for mobile */}
        <NetWorthCircle
          netWorth={netWorth}
          target={netWorthTarget}
          surplusDeficit={surplusDeficit}
          editingTarget={editingTarget}
          setEditingTarget={setEditingTarget}
          targetInput={targetInput}
          setTargetInput={setTargetInput}
          setNetWorthTarget={setNetWorthTarget}
        />
      </div>
      
      {/* Desktop Layout: Original grid layout */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <StatCard
            title="Monthly Income"
            value={formatAmount(monthlyIncome)}
            icon={DollarSign}
            contributors={(() => {
              // Top 3 income sources by payee (all transactions)
              const incomeTxs = transactions.filter(tx => (tx.amount || 0) > 0);
              const byPayee: Record<string, number> = {};
              incomeTxs.forEach(tx => {
                const name = tx.payee || 'Other';
                byPayee[name] = (byPayee[name] || 0) + tx.amount;
              });
              return Object.entries(byPayee)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, value]) => ({ name, value: formatAmount(value) }));
            })()}
          />
          <StatCard
            title="Monthly Expenses"
            value={formatAmount(monthlyExpenses)}
            icon={TrendingUp}
            contributors={(() => {
              // Top 3 expense destinations by payee (all transactions)
              const expenseTxs = transactions.filter(tx => (tx.amount || 0) < 0);
              const byPayee: Record<string, number> = {};
              expenseTxs.forEach(tx => {
                const name = tx.payee || 'Other';
                byPayee[name] = (byPayee[name] || 0) + Math.abs(tx.amount);
              });
              return Object.entries(byPayee)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, value]) => ({ name, value: formatAmount(value) }));
            })()}
          />
          <StatCard
            title="Savings Rate"
            value={`${savingsRateNum.toFixed(1)}%`}
            icon={PiggyBank}
            contributors={(() => {
              // Top 3 categories by net positive (income - expense) (all transactions)
              const byCategory: Record<string, number> = {};
              transactions.forEach(tx => {
                const cat = tx.category || 'Other';
                byCategory[cat] = (byCategory[cat] || 0) + tx.amount;
              });
              return Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, value]) => ({ name, value: formatAmount(value) }));
            })()}
          />
        </div>
        <NetWorthCircle
          netWorth={netWorth}
          target={netWorthTarget}
          surplusDeficit={surplusDeficit}
          editingTarget={editingTarget}
          setEditingTarget={setEditingTarget}
          targetInput={targetInput}
          setTargetInput={setTargetInput}
          setNetWorthTarget={setNetWorthTarget}
        />
      </div>

      {/* Draggable Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <DashboardWidget title="Quick Add" icon={Plus} className="lg:col-span-1">
          <QuickAddTransaction />
        </DashboardWidget>

        <DashboardWidget title="Active Goals" icon={Target} className="lg:col-span-2">
          {goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Target className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-2">No active goals yet</p>
              <p className="text-sm text-muted-foreground/70 mb-4">Set up savings goals to track your progress</p>
              <Button variant="outline" size="sm" className="text-xs">
                <Plus className="w-3 h-3 mr-1" />
                Create Goal
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.slice(0, 2).map((goal, index) => {
                const progress = goal.current_amount && goal.target_amount 
                  ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                  : 0;
                
                return (
                  <div key={goal.id || index} className={`glass-card p-4 rounded-xl border-accent/30 ${
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-green-500/10 to-green-400/20 shadow-[0_0_15px_rgba(0,255,0,0.2)]'
                      : 'bg-gradient-to-br from-emerald-500/10 to-emerald-400/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  }`}>
                    <p className="text-sm text-muted-foreground mb-1">{goal.name || 'Unnamed Goal'}</p>
                    <div className="flex items-baseline gap-2 mb-2">
                      <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-emerald-600'}`}>
                        {progress.toFixed(0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatAmount((goal.current_amount || 0) / 100)} / {formatAmount((goal.target_amount || 0) / 100)}
                      </p>
                    </div>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-green-500 to-green-400 shadow-[0_0_10px_rgba(0,255,0,0.5)]'
                          : 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      }`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                );
              })}
              {goals.length > 2 && (
                <div className="col-span-full text-center mt-2">
                  <p className="text-xs text-muted-foreground">+{goals.length - 2} more goals</p>
                </div>
              )}
            </div>
          )}
        </DashboardWidget>
      </div>

      {/* Bank Sync Status Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <DashboardWidget title="Bank Sync Status" icon={Link2} className="lg:col-span-1">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connected Banks</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Sync</span>
              <span className="text-sm text-muted-foreground">Never</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Not Connected</Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-3"
              onClick={() => setBankSyncOpen(true)}
            >
              <Link2 className="w-4 h-4 mr-2" />
              Connect Banks
            </Button>
          </div>
        </DashboardWidget>

        <DashboardWidget title="Import Summary" icon={Upload} className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summaryTransactions.length}</div>
              <div className="text-xs text-muted-foreground">{summaryLabel}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summaryTransactions.filter(tx => tx.category && tx.category !== 'Other').length}</div>
              <div className="text-xs text-muted-foreground">Auto-Categorized</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{summaryTransactions.filter(tx => !tx.category || tx.category === 'Other').length}</div>
              <div className="text-xs text-muted-foreground">Need Review</div>
            </div>
          </div>
        </DashboardWidget>
      </div>

      <div className={`glass-card p-8 rounded-2xl animate-fade-in-up border-accent/30 ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-green-500/5 to-green-400/10 shadow-[0_0_20px_rgba(0,255,0,0.2)]'
          : 'bg-gradient-to-br from-emerald-500/5 to-emerald-400/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Recent Transactions</h2>
          <button className="text-accent hover:text-accent/80 font-semibold text-sm transition-colors">
            View All
          </button>
        </div>
        <div className="space-y-2">
          {recentTransactions.map((transaction) => (
            <TransactionItem 
              key={transaction.id}
              merchant={transaction.payee}
              category={transaction.category || 'other'}
              amount={transaction.amount}
              date={new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
          ))}
        </div>
      </div>

      {bankSyncOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Bank Sync (Debug Mode)</h2>
            <p className="mb-4">This is a test modal to verify the functionality works.</p>
            <Button onClick={() => setBankSyncOpen(false)}>Close</Button>
          </div>
        </div>
      )}
      
      <BankSyncModal 
        open={bankSyncOpen} 
        onOpenChange={setBankSyncOpen}
      />
    </div>
  );
}
