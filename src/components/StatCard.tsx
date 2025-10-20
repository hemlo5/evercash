import { LucideIcon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative";
  icon: LucideIcon;
  contributors?: { name: string; value: string }[];
}

export function StatCard({ title, value, change, changeType, icon: Icon, contributors }: StatCardProps) {
  const { theme } = useTheme();
  return (
    <div className="glass-card-hover p-4 md:p-6 rounded-2xl animate-fade-in-up h-full flex flex-col justify-between">
      <div>
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
        <h3 className="text-xs sm:text-sm text-muted-foreground mb-1">{title}</h3>
        <p className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 leading-tight">{value}</p>
      </div>
      {contributors && contributors.length > 0 && (
        <div className={`mt-4 p-4 rounded-xl border border-accent/30 flex-1 flex flex-col justify-center min-h-[110px] ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-green-400 via-green-500 to-green-400 shadow-[0_0_25px_rgba(0,255,0,0.5)]' 
            : 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
        }`}>
          <div className="text-xs sm:text-sm font-bold text-white mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 7l-10 10M7 7h10v10" /></svg> Top Contributors
          </div>
          <ul className="space-y-2">
            {contributors.map((c, idx) => (
              <li key={idx} className="flex items-center justify-between text-sm sm:text-base font-medium text-white">
                <span className="truncate max-w-full md:max-w-[180px]">{c.name}</span>
                <span className="hidden md:inline font-mono tabular-nums text-right">{c.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
