import { useState } from "react";
import { Target, Calculator, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoalProgressCard } from "@/components/GoalProgressCard";
import { LoanCalculatorModal } from "@/components/LoanCalculatorModal";
import { ShoppingBag, Home, Car, Heart, Plane, GraduationCap } from "lucide-react";

// Integration note: Use useCategories() to fetch actual budget categories
// Map to loot-core's goal system with useBudgetGoals()
export default function Goals() {
  const [loanModalOpen, setLoanModalOpen] = useState(false);

  const goals = [
    { category: "Emergency Fund", current: 3200, target: 10000, months: 12, icon: Home },
    { category: "Vacation", current: 800, target: 3000, months: 6, icon: Plane },
    { category: "New Car", current: 5000, target: 25000, months: 24, icon: Car },
    { category: "Education", current: 2100, target: 8000, months: 18, icon: GraduationCap },
    { category: "Wedding", current: 4500, target: 15000, months: 12, icon: Heart },
    { category: "Home Down Payment", current: 12000, target: 60000, months: 36, icon: Home },
  ];

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Goals & Savings</h1>
          <p className="text-muted-foreground">Track multi-month savings targets</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setLoanModalOpen(true)}
            variant="outline"
            className="border-accent/30 hover:bg-accent/10"
          >
            <Calculator className="w-5 h-5 mr-2" />
            Loan Calculator
          </Button>
          <Button className="bg-gradient-emerald hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Plus className="w-5 h-5 mr-2" />
            New Goal
          </Button>
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl border-accent/20 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-bold">Goal Progress</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          Adjust target amounts and timelines using the sliders below
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal, index) => (
            <GoalProgressCard
              key={index}
              {...goal}
              onUpdate={(target, months) => {
                console.log("Goal updated:", { category: goal.category, target, months });
                // Integration: Call updateGoal(goalId, { target, months })
              }}
            />
          ))}
        </div>
      </div>

      <div className="glass-card p-8 rounded-2xl animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-4">Total Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Saved</p>
            <p className="text-3xl font-bold text-accent">$27,600</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Target</p>
            <p className="text-3xl font-bold">$121,000</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">On Track</p>
            <p className="text-3xl font-bold text-accent">5/6 Goals</p>
          </div>
        </div>
      </div>

      <LoanCalculatorModal open={loanModalOpen} onOpenChange={setLoanModalOpen} />
    </div>
  );
}
