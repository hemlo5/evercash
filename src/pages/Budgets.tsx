import { Coffee, ShoppingBag, Home, Car, Smartphone, Heart, Plus } from "lucide-react";
import { BudgetEnvelope } from "@/components/BudgetEnvelope";
import { Button } from "@/components/ui/button";

export default function Budgets() {
  const envelopes = [
    { category: "Groceries", allocated: 600, spent: 425, icon: ShoppingBag },
    { category: "Dining Out", allocated: 300, spent: 285, icon: Coffee },
    { category: "Housing", allocated: 1500, spent: 1500, icon: Home },
    { category: "Transportation", allocated: 400, spent: 320, icon: Car },
    { category: "Utilities", allocated: 250, spent: 180, icon: Smartphone },
    { category: "Entertainment", allocated: 200, spent: 145, icon: Heart },
  ];

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Budget Envelopes</h1>
          <p className="text-muted-foreground">Manage your spending categories</p>
        </div>
        <Button className="bg-gradient-emerald hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]">
          <Plus className="w-5 h-5 mr-2" />
          Add Envelope
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {envelopes.map((envelope, index) => (
          <BudgetEnvelope
            key={index}
            {...envelope}
          />
        ))}
      </div>

      <div className="glass-card p-8 rounded-2xl border-accent/20">
        <h2 className="text-2xl font-bold mb-4">Budget Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Allocated</p>
            <p className="text-3xl font-bold">$3,250</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
            <p className="text-3xl font-bold">$2,855</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Remaining</p>
            <p className="text-3xl font-bold text-accent">$395</p>
          </div>
        </div>
      </div>
    </div>
  );
}
