import { TrendingUp, DollarSign, PiggyBank } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { NetWorthCircle } from "@/components/NetWorthCircle";
import { TransactionItem } from "@/components/TransactionItem";

export default function Dashboard() {
  const recentTransactions = [
    { merchant: "Starbucks", category: "dining", amount: -4.99, date: "Today" },
    { merchant: "Amazon", category: "shopping", amount: -89.99, date: "Today" },
    { merchant: "Salary Deposit", category: "utilities", amount: 3500.0, date: "Yesterday" },
    { merchant: "Uber", category: "transport", amount: -12.50, date: "Yesterday" },
    { merchant: "Netflix", category: "utilities", amount: -15.99, date: "2 days ago" },
  ];

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold mb-2">Welcome back, John 👋</h1>
        <p className="text-muted-foreground">Here's your financial overview</p>
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
    </div>
  );
}
