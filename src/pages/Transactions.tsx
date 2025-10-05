import { useState } from "react";
import { Search, Upload, Download, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TransactionItem } from "@/components/TransactionItem";
import { BankSyncModal } from "@/components/BankSyncModal";
import { Badge } from "@/components/ui/badge";

// Integration note: Use useTransactions() from Actual with offline fallback
// Implement pagination with getTransactions({ offset, limit })
export default function Transactions() {
  const [bankSyncOpen, setBankSyncOpen] = useState(false);
  const transactions = [
    { merchant: "Whole Foods", category: "shopping", amount: -125.50, date: "Today, 2:30 PM" },
    { merchant: "Shell Gas Station", category: "transport", amount: -45.00, date: "Today, 10:15 AM" },
    { merchant: "Netflix", category: "utilities", amount: -15.99, date: "Yesterday, 8:00 PM" },
    { merchant: "Freelance Payment", category: "utilities", amount: 1200.00, date: "Yesterday, 3:45 PM" },
    { merchant: "Chipotle", category: "dining", amount: -12.50, date: "2 days ago" },
    { merchant: "Amazon", category: "shopping", amount: -89.99, date: "2 days ago" },
    { merchant: "Starbucks", category: "dining", amount: -4.99, date: "3 days ago" },
    { merchant: "Uber", category: "transport", amount: -18.75, date: "3 days ago" },
    { merchant: "Salary Deposit", category: "utilities", amount: 3500.00, date: "4 days ago" },
    { merchant: "Electric Bill", category: "utilities", amount: -85.00, date: "5 days ago" },
  ];

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold mb-2">Transactions</h1>
        <p className="text-muted-foreground">View and manage all your transactions</p>
      </div>

      {/* Sync Status Badge */}
      <div className="flex items-center gap-3 animate-fade-in-up">
        <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30">
          <span className="w-2 h-2 rounded-full bg-accent mr-1.5 animate-pulse"></span>
          Synced 2 min ago
        </Badge>
        <Badge variant="outline">
          243 transactions this month
        </Badge>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-12 h-12 bg-muted/30 border-border/50 focus:border-accent/50 transition-colors"
            aria-label="Search transactions"
          />
        </div>
        <Button
          variant="outline"
          className="h-12 border-accent/30 hover:bg-accent/10"
        >
          <Filter className="w-5 h-5 mr-2" />
          Filter
        </Button>
        <Button
          onClick={() => setBankSyncOpen(true)}
          className="bg-gradient-emerald hover:opacity-90 transition-opacity h-12 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        >
          <Upload className="w-5 h-5 mr-2" />
          Import / Sync
        </Button>
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">All Transactions</h2>
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
        <div className="space-y-2">
          {transactions.map((transaction, index) => (
            <TransactionItem
              key={index}
              {...transaction}
            />
          ))}
        </div>
      </div>

      <BankSyncModal open={bankSyncOpen} onOpenChange={setBankSyncOpen} />
    </div>
  );
}
