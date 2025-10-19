import { LucideIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSimpleCurrency } from "@/contexts/SimpleCurrencyContext";

interface GoalProgressCardProps {
  category: string;
  current: number;
  target: number;
  months: number;
  icon: LucideIcon;
  onUpdate?: (target: number, months: number) => void;
  onDelete?: () => void;
}

// Integration note: Use useGoal(categoryId) to sync with Actual's goal system
// Map to loot-core's budget goal tracking
export function GoalProgressCard({
  category,
  current,
  target,
  months,
  icon: Icon,
  onUpdate,
  onDelete,
}: GoalProgressCardProps) {
  const [localTarget, setLocalTarget] = useState(target);
  const [localMonths, setLocalMonths] = useState(months);
  const [hasChanges, setHasChanges] = useState(false);
  const { formatAmount } = useSimpleCurrency();
  
  const percentage = Math.min((current / localTarget) * 100, 100);
  const monthlyTarget = (localTarget / 100) / localMonths; // Convert cents to dollars first
  
  const handleTargetChange = (newTarget: number) => {
    setLocalTarget(newTarget * 100); // Convert to cents
    setHasChanges(true);
  };
  
  const handleMonthsChange = (newMonths: number) => {
    setLocalMonths(newMonths);
    setHasChanges(true);
  };
  
  const handleUpdate = () => {
    onUpdate?.(localTarget, localMonths);
    setHasChanges(false);
  };
  
  const data = [
    { name: "Current", value: percentage },
    { name: "Remaining", value: 100 - percentage },
  ];

  return (
    <div className="glass-card-hover p-6 rounded-2xl space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-emerald-subtle flex items-center justify-center">
          <Icon className="w-6 h-6 text-accent" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold">{category}</h3>
          <p className="text-sm text-muted-foreground">
            {formatAmount(current / 100)} / {formatAmount(localTarget / 100)}
          </p>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="relative h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={50}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill="hsl(160 84% 39%)" />
              <Cell fill="hsl(220 16% 22%)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-accent">{percentage.toFixed(0)}%</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Target Amount</Label>
          <Input
            type="number"
            value={localTarget / 100} // Show dollars instead of cents
            onChange={(e) => handleTargetChange(Number(e.target.value))}
            className="mt-1 bg-muted/30"
          />
        </div>
        
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
            Timeline: {localMonths} months
          </Label>
          <Slider
            value={[localMonths]}
            onValueChange={([value]) => handleMonthsChange(value)}
            min={1}
            max={24}
            step={1}
            className="[&_[role=slider]]:bg-accent [&_[role=slider]]:border-accent"
          />
        </div>

        <div className="glass-card p-3 rounded-lg border-accent/10">
          <p className="text-xs text-muted-foreground">Monthly target</p>
          <p className="text-lg font-bold">{formatAmount(monthlyTarget)}</p>
        </div>
        
        {hasChanges && (
          <Button 
            onClick={handleUpdate}
            className="w-full bg-gradient-emerald hover:opacity-90 transition-opacity"
          >
            <Save className="w-4 h-4 mr-2" />
            Update Goal
          </Button>
        )}
      </div>
    </div>
  );
}
