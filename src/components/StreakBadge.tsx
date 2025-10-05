import { Flame, Trophy, Star } from "lucide-react";

interface StreakBadgeProps {
  days: number;
  milestone?: "bronze" | "silver" | "gold";
}

// Integration note: Calculate streak from consecutive budget-adherent days
// Use useUserStreak() hook with local storage fallback
export function StreakBadge({ days, milestone }: StreakBadgeProps) {
  const Icon = milestone ? Trophy : Flame;
  
  const milestoneColors = {
    bronze: "from-amber-600 to-amber-800",
    silver: "from-slate-300 to-slate-500",
    gold: "from-accent to-emerald-600",
  };

  return (
    <div className="flex items-center gap-2 animate-scale-in">
      <div
        className={`p-2 rounded-lg ${
          milestone
            ? `bg-gradient-to-br ${milestoneColors[milestone]}`
            : "bg-gradient-emerald-subtle"
        } animate-glow-pulse`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-bold">{days} Day Streak</p>
        {milestone && (
          <p className="text-xs text-muted-foreground capitalize">{milestone} Level</p>
        )}
      </div>
    </div>
  );
}
