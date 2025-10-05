import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative";
  icon: LucideIcon;
}

export function StatCard({ title, value, change, changeType, icon: Icon }: StatCardProps) {
  return (
    <div className="glass-card-hover p-6 rounded-2xl animate-fade-in-up">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-gradient-emerald-subtle">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        {change && (
          <span
            className={`text-sm font-semibold ${
              changeType === "positive" ? "text-accent" : "text-destructive"
            }`}
          >
            {change}
          </span>
        )}
      </div>
      <h3 className="text-sm text-muted-foreground mb-1">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
