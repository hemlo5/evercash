import { Search, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TransactionItem } from "@/components/TransactionItem";

export default function Transactions() {
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

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-12 h-12 bg-muted/30 border-border/50 focus:border-accent/50 transition-colors"
          />
        </div>
        <Button className="bg-gradient-emerald hover:opacity-90 transition-opacity h-12 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <Upload className="w-5 h-5 mr-2" />
          Import CSV
        </Button>
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <div className="space-y-2">
          {transactions.map((transaction, index) => (
            <TransactionItem
              key={index}
              {...transaction}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
