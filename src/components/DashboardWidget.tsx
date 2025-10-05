import { LucideIcon, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";

interface DashboardWidgetProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

// Integration note: Use react-grid-layout for drag-and-drop functionality
// Store layout preferences in localStorage or user settings
export function DashboardWidget({ title, icon: Icon, children, className }: DashboardWidgetProps) {
  return (
    <Card className={`glass-card-hover p-6 rounded-2xl relative group ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-emerald-subtle flex items-center justify-center">
            <Icon className="w-5 h-5 text-accent" />
          </div>
          <h3 className="font-bold text-lg">{title}</h3>
        </div>
        <GripVertical className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-move" />
      </div>
      {children}
    </Card>
  );
}
