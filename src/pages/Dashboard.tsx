import { useState } from "react";
import { TrendingUp, DollarSign, PiggyBank, Plus, Zap, Target } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { NetWorthCircle } from "@/components/NetWorthCircle";
import { TransactionItem } from "@/components/TransactionItem";
import { AIInsightBadge } from "@/components/AIInsightBadge";
import { StreakBadge } from "@/components/StreakBadge";
import { DashboardWidget } from "@/components/DashboardWidget";
import { QuickAddTransaction } from "@/components/QuickAddTransaction";
import { BankSyncModal } from "@/components/BankSyncModal";
import { Button } from "@/components/ui/button";

// Integration note: Use useBudget() hook from Actual for real-time balance updates
// Map budgetData prop to loot-core's getBudgetMonth() for current month data
export default function Dashboard() {
  const [bankSyncOpen, setBankSyncOpen] = useState(false);

  const recentTransactions = [
    { merchant: "Starbucks", category: "dining", amount: -4.99, date: "Today" },
    { merchant: "Amazon", category: "shopping", amount: -89.99, date: "Today" },
    { merchant: "Salary Deposit", category: "utilities", amount: 3500.0, date: "Yesterday" },
    { merchant: "Uber", category: "transport", amount: -12.50, date: "Yesterday" },
    { merchant: "Netflix", category: "utilities", amount: -15.99, date: "2 days ago" },
  ];

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Welcome back, John 👋</h1>
          <p className="text-muted-foreground">Here's your financial overview</p>
        </div>
        <Button
          onClick={() => setBankSyncOpen(true)}
          className="bg-gradient-emerald hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        >
          <Zap className="w-5 h-5 mr-2" />
          Sync Bank
        </Button>
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
            value="$5,240"
            change="+12.5%"
            changeType="positive"
            icon={DollarSign}
          />
          <StatCard
            title="Monthly Expenses"
            value="$3,890"
            change="-5.2%"
            changeType="positive"
            icon={TrendingUp}
          />
          <StatCard
            title="Savings Rate"
            value="25.8%"
            change="+3.1%"
            changeType="positive"
            icon={PiggyBank}
          />
        </div>
        <NetWorthCircle netWorth={45000} target={60000} />
      </div>

      {/* Draggable Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardWidget title="Quick Add" icon={Plus} className="lg:col-span-1">
          <QuickAddTransaction />
        </DashboardWidget>

        <DashboardWidget title="Active Goals" icon={Target} className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4 rounded-xl border-accent/10">
              <p className="text-sm text-muted-foreground mb-1">Emergency Fund</p>
              <p className="text-2xl font-bold">32%</p>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-emerald" style={{ width: "32%" }}></div>
              </div>
            </div>
            <div className="glass-card p-4 rounded-xl border-accent/10">
              <p className="text-sm text-muted-foreground mb-1">Vacation</p>
              <p className="text-2xl font-bold">27%</p>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-emerald" style={{ width: "27%" }}></div>
              </div>
            </div>
          </div>
        </DashboardWidget>
      </div>

      <div className="glass-card p-8 rounded-2xl animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Recent Transactions</h2>
          <button className="text-accent hover:text-accent/80 font-semibold text-sm transition-colors">
            View All
          </button>
        </div>
        <div className="space-y-2">
          {recentTransactions.map((transaction, index) => (
            <TransactionItem key={index} {...transaction} />
          ))}
        </div>
      </div>

      <BankSyncModal open={bankSyncOpen} onOpenChange={setBankSyncOpen} />
    </div>
  );
}
