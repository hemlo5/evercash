import { useState, useEffect } from "react";
import { Target, Calculator, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoalProgressCard } from "@/components/GoalProgressCard";
import { LoanCalculatorModal } from "@/components/LoanCalculatorModal";
import { ShoppingBag, Home, Car, Heart, Plane, GraduationCap } from "lucide-react";
import { useApi } from "@/contexts/ApiContext";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import type { Category, CategoryGroup } from "@/lib/api";

interface Goal {
  id: string;
  category: string;
  current: number; // in cents
  target: number;  // in cents
  months: number;
  icon: any;
}

export default function Goals() {
  const { api } = useApi();
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (api) {
      loadGoalsData();
    }
  }, [api]);

  const loadGoalsData = async () => {
    if (!api) return;
    
    setIsLoading(true);
    try {
      // Get categories with goal information
      const categoryGroups = await api.getCategories(true) as CategoryGroup[];
      
      // Extract categories that have goals or savings targets
      const goalsData: Goal[] = [];
      
      categoryGroups.forEach(group => {
        if (!group.is_income) {
          group.categories.forEach(category => {
            // Look for categories that might be savings goals
            const categoryName = category.name.toLowerCase();
            const isSavingsCategory = 
              categoryName.includes('emergency') ||
              categoryName.includes('vacation') ||
              categoryName.includes('car') ||
              categoryName.includes('education') ||
              categoryName.includes('wedding') ||
              categoryName.includes('house') ||
              categoryName.includes('home') ||
              categoryName.includes('savings') ||
              categoryName.includes('goal');
            
            if (isSavingsCategory || category.balance > 0) {
              // Determine icon based on category name
              let icon = Target;
              if (categoryName.includes('emergency') || categoryName.includes('home') || categoryName.includes('house')) icon = Home;
              if (categoryName.includes('vacation') || categoryName.includes('travel')) icon = Plane;
              if (categoryName.includes('car') || categoryName.includes('vehicle')) icon = Car;
              if (categoryName.includes('education') || categoryName.includes('school')) icon = GraduationCap;
              if (categoryName.includes('wedding') || categoryName.includes('love')) icon = Heart;
              
              goalsData.push({
                id: category.id,
                category: category.name,
                current: Math.max(0, category.balance || 0), // Current saved amount
                target: Math.max(category.balance || 0, 100000), // Default target or current balance
                months: 12, // Default timeline
                icon
              });
            }
          });
        }
      });
      
      // If no goals found, create some default examples
      if (goalsData.length === 0) {
        goalsData.push(
          { id: 'emergency', category: "Emergency Fund", current: 320000, target: 1000000, months: 12, icon: Home },
          { id: 'vacation', category: "Vacation", current: 80000, target: 300000, months: 6, icon: Plane },
          { id: 'car', category: "New Car", current: 500000, target: 2500000, months: 24, icon: Car }
        );
      }
      
      setGoals(goalsData);
    } catch (error) {
      console.error('Failed to load goals data:', error);
      toast.error('Failed to load goals data');
      
      // Fallback to mock data
      setGoals([
        { id: 'emergency', category: "Emergency Fund", current: 320000, target: 1000000, months: 12, icon: Home },
        { id: 'vacation', category: "Vacation", current: 80000, target: 300000, months: 6, icon: Plane },
        { id: 'car', category: "New Car", current: 500000, target: 2500000, months: 24, icon: Car },
        { id: 'education', category: "Education", current: 210000, target: 800000, months: 18, icon: GraduationCap },
        { id: 'wedding', category: "Wedding", current: 450000, target: 1500000, months: 12, icon: Heart },
        { id: 'house', category: "Home Down Payment", current: 1200000, target: 6000000, months: 36, icon: Home },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading goals...</span>
      </div>
    );
  }

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
              onUpdate={async (target, months) => {
                console.log("Goal updated:", { category: goal.category, target, months });
                try {
                  // Update the goal in the local state
                  setGoals(prevGoals => 
                    prevGoals.map(g => 
                      g.id === goal.id 
                        ? { ...g, target, months }
                        : g
                    )
                  );
                  toast.success(`Updated ${goal.category} goal`);
                } catch (error) {
                  console.error('Failed to update goal:', error);
                  toast.error('Failed to update goal');
                }
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
