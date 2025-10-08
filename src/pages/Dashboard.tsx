import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, PiggyBank, Plus, Zap, Target, Loader2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { NetWorthCircle } from "@/components/NetWorthCircle";
import { TransactionItem } from "@/components/TransactionItem";
import { AIInsightBadge } from "@/components/AIInsightBadge";
import { StreakBadge } from "@/components/StreakBadge";
import { DashboardWidget } from "@/components/DashboardWidget";
import { QuickAddTransaction } from "@/components/QuickAddTransaction";
import { BankSyncModal } from "@/components/BankSyncModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useApi } from "@/contexts/ApiContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import type { Account as ApiAccount, Transaction as ApiTransaction } from "@/lib/api";

interface BudgetData {
  incomeMonth: number;
  expenseMonth: number;
  balance: number;
}

export default function Dashboard() {
  const [netWorthTarget, setNetWorthTarget] = useState(() => {
    const stored = localStorage.getItem('netWorthTarget');
    return stored ? Number(stored) : 60000;
  });
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(netWorthTarget.toString());
  const [bankSyncOpen, setBankSyncOpen] = useState(false);
  const { api, loading, error } = useApi();
  const { theme } = useTheme();
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!api) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Get current month string
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const currentYear = now.getFullYear();
        const currentMonthNum = now.getMonth() + 1;

        // Fetch all required data in parallel
        const [accountsData, budgetMonth, allTransactions] = await Promise.all([
          api.getAccounts(),
          api.getBudgetMonth(currentMonth),
          api.getTransactions() // Get all transactions, then filter
        ]);

        // Filter transactions for current month
        const transactionsData = allTransactions.filter(tx => {
          if (!tx.date) return false;
          const txDate = new Date(tx.date);
          return txDate.getFullYear() === currentYear && (txDate.getMonth() + 1) === currentMonthNum;
        });

        setAccounts(accountsData);
        setTransactions(transactionsData);

        // Calculate totals directly from transactions
        let totalIncome = 0;
        let totalExpenses = 0;

        console.log('Processing transactions for dashboard:', transactionsData);

        transactionsData.forEach(transaction => {
          const amount = (transaction.amount || 0) / 100; // Convert from cents to dollars
          console.log('Transaction amount:', amount, 'for transaction:', transaction);
          
          if (amount > 0) {
            totalIncome += amount;
          } else if (amount < 0) {
            totalExpenses += Math.abs(amount);
          }
        });

        console.log('Calculated totals - Income:', totalIncome, 'Expenses:', totalExpenses);

        setBudgetData({
          incomeMonth: totalIncome,
          expenseMonth: totalExpenses,
          balance: totalIncome - totalExpenses
        });

      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [api]);

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
  if (error || !api) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-4 text-center">
        <div className="mb-4 rounded-full bg-red-100 p-3">
          <Zap className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Failed to load data</h2>
        <p className="mb-4 text-muted-foreground">
          {error?.message || 'Unable to connect to the server'}
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  // Helpers
  const formatCurrency = (num: number) =>
    num.toLocaleString("en-US", { style: "currency", currency: "USD" });

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
  const netWorth = (accounts?.reduce((sum: number, a: ApiAccount) => sum + (a.balance ?? 0), 0) ?? 0) / 100;

  // Get the 5 most recent transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);


  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Welcome back, John 👋</h1>
          <p className="text-muted-foreground">Here's your financial overview</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            onClick={() => setBankSyncOpen(true)}
            className={`font-bold transition-all ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 text-black shadow-[0_0_20px_rgba(0,255,0,0.4)]'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            }`}
          >
            <Zap className="w-5 h-5 mr-2" />
            Sync Bank
          </Button>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="flex flex-wrap gap-3 animate-fade-in-up">
        <AIInsightBadge
          type="warning"
          message="Dining over budget"
          detail="You've spent $285 of $300 in dining this month. Consider reducing restaurant visits."
        />
        <AIInsightBadge
          type="success"
          message="Savings on track"
          detail="You're 12% ahead of your monthly savings goal!"
        />
        <StreakBadge days={28} milestone="gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Monthly Income"
            value={formatCurrency(monthlyIncome)}
            icon={DollarSign}
            contributors={(() => {
              // Top 3 income sources by payee
              const incomeTxs = transactions.filter(tx => (tx.amount || 0) > 0);
              const byPayee: Record<string, number> = {};
              incomeTxs.forEach(tx => {
                const name = tx.payee || 'Other';
                byPayee[name] = (byPayee[name] || 0) + tx.amount;
              });
              return Object.entries(byPayee)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, value]) => ({ name, value: formatCurrency(value / 100) }));
            })()}
          />
          <StatCard
            title="Monthly Expenses"
            value={formatCurrency(monthlyExpenses)}
            icon={TrendingUp}
            contributors={(() => {
              // Top 3 expense destinations by payee
              const expenseTxs = transactions.filter(tx => (tx.amount || 0) < 0);
              const byPayee: Record<string, number> = {};
              expenseTxs.forEach(tx => {
                const name = tx.payee || 'Other';
                byPayee[name] = (byPayee[name] || 0) + Math.abs(tx.amount);
              });
              return Object.entries(byPayee)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, value]) => ({ name, value: formatCurrency(value / 100) }));
            })()}
          />
          <StatCard
            title="Savings Rate"
            value={`${savingsRateNum.toFixed(1)}%`}
            icon={PiggyBank}
            contributors={(() => {
              // Top 3 categories by net positive (income - expense)
              const byCategory: Record<string, number> = {};
              transactions.forEach(tx => {
                const cat = tx.category || 'Other';
                byCategory[cat] = (byCategory[cat] || 0) + tx.amount;
              });
              return Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, value]) => ({ name, value: formatCurrency(value / 100) }));
            })()}
          />
        </div>
        <NetWorthCircle
          netWorth={netWorth}
          target={netWorthTarget}
          editingTarget={editingTarget}
          setEditingTarget={setEditingTarget}
          targetInput={targetInput}
          setTargetInput={setTargetInput}
          setNetWorthTarget={setNetWorthTarget}
        />
      </div>

      {/* Draggable Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardWidget title="Quick Add" icon={Plus} className="lg:col-span-1">
          <QuickAddTransaction />
        </DashboardWidget>

        <DashboardWidget title="Active Goals" icon={Target} className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div className={`glass-card p-4 rounded-xl border-accent/30 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-green-500/10 to-green-400/20 shadow-[0_0_15px_rgba(0,255,0,0.2)]'
                : 'bg-gradient-to-br from-emerald-500/10 to-emerald-400/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            }`}>
              <p className="text-sm text-muted-foreground mb-1">Emergency Fund</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-emerald-600'}`}>32%</p>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-green-500 to-green-400 shadow-[0_0_10px_rgba(0,255,0,0.5)]'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                }`} style={{ width: "32%" }}></div>
              </div>
            </div>
            <div className={`glass-card p-4 rounded-xl border-accent/30 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-green-500/10 to-green-400/20 shadow-[0_0_15px_rgba(0,255,0,0.2)]'
                : 'bg-gradient-to-br from-emerald-500/10 to-emerald-400/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            }`}>
              <p className="text-sm text-muted-foreground mb-1">Vacation</p>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-emerald-600'}`}>27%</p>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-green-500 to-green-400 shadow-[0_0_10px_rgba(0,255,0,0.5)]'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                }`} style={{ width: "27%" }}></div>
              </div>
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
              amount={transaction.amount / 100}
              date={new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
