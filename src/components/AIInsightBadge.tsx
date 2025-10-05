import { Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AIInsightBadgeProps {
  type: "success" | "warning" | "info";
  message: string;
  detail?: string;
}

// Integration note: Connect to AI insights API endpoint
// Use useAIInsights() hook to fetch predictions based on spending patterns
export function AIInsightBadge({ type, message, detail }: AIInsightBadgeProps) {
  const Icon = type === "warning" ? AlertTriangle : type === "success" ? TrendingUp : Sparkles;
  
  const colorClasses = {
    success: "bg-accent/20 text-accent border-accent/30",
    warning: "bg-destructive/20 text-destructive border-destructive/30",
    info: "bg-primary/20 text-primary border-primary/30",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${colorClasses[type]} cursor-help animate-fade-in`}
          role="status"
          aria-label={`AI insight: ${message}`}
        >
          <Icon className="w-4 h-4" />
          <span className="text-xs font-semibold">{message}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="glass-card border-accent/20 max-w-xs">
        <p className="text-sm">{detail || message}</p>
      </TooltipContent>
    </Tooltip>
  );
}
