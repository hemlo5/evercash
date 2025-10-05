import { LucideIcon } from "lucide-react";

interface BudgetEnvelopeProps {
  category: string;
  allocated: number;
  spent: number;
  icon: LucideIcon;
}

export function BudgetEnvelope({ category, allocated, spent, icon: Icon }: BudgetEnvelopeProps) {
  const percentage = (spent / allocated) * 100;
  const isOverBudget = percentage > 100;

  return (
    <div className="glass-card-hover p-6 rounded-2xl animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-emerald-subtle flex items-center justify-center">
            <Icon className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold">{category}</h3>
            <p className="text-sm text-muted-foreground">
              ${spent.toFixed(0)} / ${allocated.toFixed(0)}
            </p>
          </div>
        </div>
      </div>
      
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
            isOverBudget
              ? "bg-gradient-to-r from-destructive to-destructive/80"
              : "bg-gradient-emerald"
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between mt-3">
        <span className="text-sm text-muted-foreground">
          {percentage.toFixed(0)}% used
        </span>
        <span className={`text-sm font-semibold ${isOverBudget ? "text-destructive" : "text-accent"}`}>
          ${(allocated - spent).toFixed(0)} left
        </span>
      </div>
    </div>
  );
}
