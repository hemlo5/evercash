import { useState, useEffect } from "react";
import { Target, Calculator, Plus, Loader2, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoalProgressCard } from "@/components/GoalProgressCard";
import { LoanCalculatorModal } from "@/components/LoanCalculatorModal";
import { ShoppingBag, Home, Car, Heart, Plane, GraduationCap } from "lucide-react";
import { useApi } from '@/contexts/HybridApiContext';
import { useSimpleCurrency } from "@/contexts/SimpleCurrencyContext";
import { toast } from "sonner";

interface Goal {
  id: string;
  category: string;
  current: number; // in cents
  target: number;  // in cents
  months: number;
  icon: any;
}

export default function Goals() {
  const { api, loading } = useApi();
  const { formatAmount } = useSimpleCurrency();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalCurrent, setNewGoalCurrent] = useState("");
  const [newGoalMonths, setNewGoalMonths] = useState("12");
  const [newGoalIcon, setNewGoalIcon] = useState("target");
  const [newGoalModalOpen, setNewGoalModalOpen] = useState(false);
  
  // Surplus allocation state
  const [surplusDeficit, setSurplusDeficit] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [multiGoalAllocationOpen, setMultiGoalAllocationOpen] = useState(false);
  const [goalAllocations, setGoalAllocations] = useState<Record<string, number>>({});
  const [totalAllocated, setTotalAllocated] = useState(0);

  useEffect(() => {
    if (api) {
      loadGoals();
      loadTransactions();
    }
  }, [api]);

  const loadGoals = async () => {
    if (!api) return;
    
    setIsLoading(true);
    try {
      const goalsData = await api.getGoals();
      const formattedGoals = goalsData.map(goal => ({
        id: goal.id,
        category: goal.name,
        current: goal.current_amount,
        target: goal.target_amount,
        months: 12, // Default since target_months doesn't exist
        icon: Target // Default icon since icon column doesn't exist
      }));
      setGoals(formattedGoals);
    } catch (error) {
      console.error('Failed to load goals:', error);
      // Fallback to default goals if database fails
      setGoals([
        { id: 'emergency', category: "Emergency Fund", current: 320000, target: 1000000, months: 12, icon: Home },
        { id: 'vacation', category: "Vacation", current: 80000, target: 300000, months: 6, icon: Plane },
        { id: 'car', category: "New Car", current: 500000, target: 2500000, months: 24, icon: Car },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!api) return;
    
    try {
      const transactions = await api.getTransactions();
      setTransactions(transactions || []);
      calculateSurplusDeficit(transactions || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
      setSurplusDeficit(0);
    }
  };

  const calculateSurplusDeficit = (transactions: any[]) => {
    const income = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const surplus = income - expenses;
    setSurplusDeficit(surplus);
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'home': return Home;
      case 'car': return Car;
      case 'plane': return Plane;
      case 'heart': return Heart;
      case 'education': return GraduationCap;
      case 'shopping': return ShoppingBag;
      default: return Target;
    }
  };

  const handleDeleteGoal = async (goalId: string, goalName: string) => {
    if (!api) return;
    
    try {
      // Show confirmation
      if (!confirm(`Are you sure you want to delete the "${goalName}" goal? This action cannot be undone.`)) {
        return;
      }
      
      // Delete the goal from the database
      await api.deleteGoal(goalId);
      toast.success(`Deleted "${goalName}" goal`);
      
      // Reload goals to reflect the change
      await loadGoals();
    } catch (error) {
      console.error('Failed to delete goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  const handleCreateGoal = async () => {
    if (!api || !newGoalName || !newGoalTarget) {
      toast.error('Please fill in goal name and target amount');
      return;
    }

    try {
      // Convert dollars to cents for storage
      const targetCents = Math.round(parseFloat(newGoalTarget) * 100);
      const currentCents = Math.round(parseFloat(newGoalCurrent || '0') * 100);

      const goalData = {
        name: newGoalName,
        target_amount: targetCents,
        current_amount: currentCents,
        target_date: null // Use target_date instead of target_months for now
      };

      await api.createGoal(goalData);
      toast.success(`Created goal: ${newGoalName}`);
      
      // Reset form
      setNewGoalName('');
      setNewGoalTarget('');
      setNewGoalCurrent('');
      setNewGoalMonths('12');
      setNewGoalIcon('target');
      setNewGoalModalOpen(false);
      
      // Reload goals to show the new one
      await loadGoals();
    } catch (error) {
      console.error('Failed to create goal:', error);
      toast.error('Failed to create goal');
    }
  };

  // Goal allocation functions
  const handleMultiGoalAllocation = () => {
    if (surplusDeficit <= 0) {
      toast.error('No surplus available for allocation');
      return;
    }
    
    // Initialize allocations for all goals
    const initialAllocations: Record<string, number> = {};
    goals.forEach(goal => {
      initialAllocations[goal.id] = 0;
    });
    
    setGoalAllocations(initialAllocations);
    setTotalAllocated(0);
    setMultiGoalAllocationOpen(true);
  };

  const updateGoalAllocation = (goalId: string, amount: number) => {
    setGoalAllocations(prev => {
      const newAllocations = { ...prev, [goalId]: amount };
      const total = Object.values(newAllocations).reduce((sum, val) => sum + val, 0);
      setTotalAllocated(total);
      return newAllocations;
    });
  };

  const handleConfirmMultiGoalAllocation = async () => {
    if (!api) return;
    
    const availableSurplus = surplusDeficit;
    if (totalAllocated > availableSurplus) {
      toast.error(`Cannot allocate ${formatAmount(totalAllocated)}. Available surplus: ${formatAmount(availableSurplus)}`);
      return;
    }

    if (totalAllocated <= 0) {
      toast.error('Please allocate at least some amount to goals');
      return;
    }

    try {
      let allocatedGoals = 0;
      
      for (const [goalId, amount] of Object.entries(goalAllocations)) {
        if (amount > 0) {
          const goal = goals.find(g => g.id === goalId);
          if (goal) {
            // amount is in dollars from UI, convert to cents before adding to stored cents
            const newCurrentAmount = (goal.current || 0) + Math.round((amount as number) * 100);
            await api.updateGoal(goalId, { current_amount: newCurrentAmount });
            allocatedGoals++;
          }
        }
      }
      // Create a single expense transaction to reflect allocation and reduce surplus
      try {
        const accounts = await api.getAccounts();
        const account = (accounts || []).find((a: any) => !a.closed) || (accounts || [])[0];
        if (!account) {
          toast.error('No account found to post allocation transaction');
        } else if (totalAllocated > 0) {
          // Ensure a Savings category exists
          const categories = await api.getCategories();
          const savingsCatName = 'Savings';
          const hasSavings = (categories || []).some((c: any) => (c.name || '').toLowerCase() === savingsCatName.toLowerCase());
          if (!hasSavings) {
            await api.createCategory({ name: savingsCatName, is_income: false, sort_order: 999 });
          }
          // Compose notes with allocation breakdown
          const breakdown = Object.entries(goalAllocations)
            .filter(([_, amt]) => (amt as number) > 0)
            .map(([gid, amt]) => {
              const g = goals.find(x => x.id === gid);
              return `${g?.category || gid}: ${formatAmount(amt as number)}`;
            })
            .join(', ');
          const notes = `Goal allocation • ${breakdown}`;
          // Post expense transaction (negative amount)
          await api.addTransaction({
            account: account.id,
            amount: -Math.abs(totalAllocated),
            date: new Date().toISOString().slice(0, 10),
            notes,
            payee: 'Goal Allocation',
            category: savingsCatName,
            cleared: true,
            imported: false,
          });
        }
      } catch (txErr) {
        console.error('Failed to create allocation transaction:', txErr);
        // Continue even if transaction fails; goals still updated
      }

      toast.success(`Successfully allocated ${formatAmount(totalAllocated)} across ${allocatedGoals} goals`);
      setMultiGoalAllocationOpen(false);
      setGoalAllocations({});
      setTotalAllocated(0);
      await loadGoals();
      await loadTransactions(); // Recalculate surplus
      try {
        window.dispatchEvent(new Event('transactions-updated'));
      } catch {}
    } catch (error) {
      console.error('Failed to allocate to goals:', error);
      toast.error('Failed to allocate to goals');
    }
  };

  const suggestGoalAllocations = () => {
    const availableSurplus = surplusDeficit;
    if (availableSurplus <= 0) return;

    // Sort goals by priority (those closer to completion or with target dates)
    const sortedGoals = [...goals].sort((a, b) => {
      const aProgress = (a.current || 0) / (a.target || 1);
      const bProgress = (b.current || 0) / (b.target || 1);
      
      // Prioritize goals that are closer to completion but not yet complete
      if (aProgress < 1 && bProgress < 1) {
        return bProgress - aProgress; // Higher progress first
      }
      if (aProgress >= 1 && bProgress < 1) return 1; // Incomplete goals first
      if (aProgress < 1 && bProgress >= 1) return -1;
      return 0;
    });

    const suggestions: Record<string, number> = {};
    let remainingSurplus = availableSurplus;

    sortedGoals.forEach(goal => {
      if (remainingSurplus <= 0) return;
      
      const currentAmount = (goal.current || 0);
      const targetAmount = (goal.target || 0);
      const remainingNeeded = Math.max(0, targetAmount - currentAmount);
      
      if (remainingNeeded > 0) {
        // Allocate up to 30% of remaining surplus or what's needed, whichever is smaller
        const suggestedAmount = Math.min(remainingSurplus * 0.3, remainingNeeded);
        suggestions[goal.id] = Math.round(suggestedAmount * 100) / 100; // Round to 2 decimals
        remainingSurplus -= suggestedAmount;
      }
    });

    setGoalAllocations(suggestions);
    const total = Object.values(suggestions).reduce((sum, val) => sum + val, 0);
    setTotalAllocated(total);
    toast.info(`Suggested allocation of ${formatAmount(total)} across ${Object.keys(suggestions).length} goals`);
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
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-4xl font-bold mb-2">
            <span className="hidden sm:inline">Goals & Savings</span>
            <span className="sm:hidden">Goals</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            <span className="hidden sm:inline">Track multi-month savings targets</span>
            <span className="sm:hidden">Track savings targets</span>
          </p>
        </div>
        
        {/* Desktop: All buttons in one row */}
        <div className="hidden md:flex gap-3">
          {surplusDeficit > 0 && (
            <Button
              onClick={handleMultiGoalAllocation}
              className="bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              Allocate Surplus ({formatAmount(surplusDeficit)})
            </Button>
          )}
          <Button
            onClick={() => setLoanModalOpen(true)}
            variant="outline"
            className="border-accent/30 hover:bg-accent/10"
          >
            <Calculator className="w-5 h-5 mr-2" />
            Loan Calculator
          </Button>
          <Button 
            onClick={() => setNewGoalModalOpen(true)}
            className="bg-gradient-emerald hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Goal
          </Button>
        </div>
        
        {/* Mobile: Stacked layout */}
        <div className="md:hidden space-y-3 w-full">
          {/* First row: Allocate Surplus (if available) */}
          {surplusDeficit > 0 && (
            <Button
              onClick={handleMultiGoalAllocation}
              className="bg-green-600 hover:bg-green-700 w-full h-12 text-sm"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Allocate Surplus ({formatAmount(surplusDeficit)})
            </Button>
          )}
          
          {/* Second row: Loan Calculator and New Goal */}
          <div className="flex gap-2">
            <Button
              onClick={() => setLoanModalOpen(true)}
              variant="outline"
              className="border-accent/30 hover:bg-accent/10 flex-1 h-12 text-xs px-2"
            >
              <Calculator className="w-4 h-4 mr-1" />
              <span className="hidden xs:inline">Loan Calculator</span>
              <span className="xs:hidden">Loan Calc</span>
            </Button>
            <Button 
              onClick={() => setNewGoalModalOpen(true)}
              className="bg-gradient-emerald hover:opacity-90 transition-opacity flex-1 h-12 text-xs px-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Goal
            </Button>
          </div>
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
              onDelete={() => handleDeleteGoal(goal.id, goal.category)}
              onUpdate={async (target, months) => {
                console.log("Goal updated:", { category: goal.category, target, months });
                try {
                  // Update the goal in the database (only target_amount since target_months doesn't exist)
                  await api.updateGoal(goal.id, {
                    target_amount: target // Already in cents from GoalProgressCard
                  });
                  
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
            <p className="text-3xl font-bold text-accent">{formatAmount(goals.reduce((sum, goal) => sum + goal.current, 0) / 100)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Target</p>
            <p className="text-3xl font-bold">{formatAmount(goals.reduce((sum, goal) => sum + goal.target, 0) / 100)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">On Track</p>
            <p className="text-3xl font-bold text-accent">{goals.filter(goal => goal.current >= goal.target * 0.5).length}/{goals.length} Goals</p>
          </div>
        </div>
      </div>

      <LoanCalculatorModal open={loanModalOpen} onOpenChange={setLoanModalOpen} />
      
      {/* New Goal Modal */}
      <Dialog open={newGoalModalOpen} onOpenChange={setNewGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="goalName">Goal Name</Label>
              <Input
                id="goalName"
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                placeholder="e.g., Emergency Fund, Vacation"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="targetAmount">Target Amount ($)</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                placeholder="e.g., 10000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currentAmount">Current Amount ($)</Label>
              <Input
                id="currentAmount"
                type="number"
                step="0.01"
                value={newGoalCurrent}
                onChange={(e) => setNewGoalCurrent(e.target.value)}
                placeholder="e.g., 1000 (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="months">Timeline (months)</Label>
              <Input
                id="months"
                type="number"
                value={newGoalMonths}
                onChange={(e) => setNewGoalMonths(e.target.value)}
                placeholder="e.g., 12"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="icon">Icon</Label>
              <Select value={newGoalIcon} onValueChange={setNewGoalIcon}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="target">🎯 Target</SelectItem>
                  <SelectItem value="home">🏠 Home</SelectItem>
                  <SelectItem value="car">🚗 Car</SelectItem>
                  <SelectItem value="plane">✈️ Travel</SelectItem>
                  <SelectItem value="heart">💖 Wedding</SelectItem>
                  <SelectItem value="education">🎓 Education</SelectItem>
                  <SelectItem value="shopping">🛍️ Shopping</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewGoalModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGoal}>
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Smart Goal Allocation Dialog */}
      <Dialog open={multiGoalAllocationOpen} onOpenChange={setMultiGoalAllocationOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Smart Surplus Allocation</DialogTitle>
            <DialogDescription>
              Allocate your surplus of {formatAmount(surplusDeficit)} across your goals. 
              Use smart suggestions for optimal distribution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Allocation Summary */}
            <div className="bg-accent/10 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total Allocated:</span>
                <span className="text-lg font-bold text-green-600">{formatAmount(totalAllocated)}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Available Surplus:</span>
                <span className="text-lg font-bold">{formatAmount(surplusDeficit)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Remaining:</span>
                <span className={`text-lg font-bold ${surplusDeficit - totalAllocated >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatAmount(surplusDeficit - totalAllocated)}
                </span>
              </div>
              <div className="mt-2">
                <Button 
                  onClick={suggestGoalAllocations}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Get Smart Suggestions
                </Button>
              </div>
            </div>

            {/* Goals List */}
            {goals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No goals found.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create some goals first to allocate surplus funds.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {goals.length} goals available for allocation
                  </p>
                </div>
                
                {goals.map((goal) => {
                  const currentAmount = (goal.current || 0) / 100;
                  const targetAmount = (goal.target || 0) / 100;
                  const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
                  const remainingNeeded = Math.max(0, targetAmount - currentAmount);
                  const allocationAmount = goalAllocations[goal.id] || 0;
                  
                  return (
                    <div key={goal.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{goal.category}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>Current: {formatAmount(currentAmount)}</span>
                            <span>Target: {formatAmount(targetAmount)}</span>
                            <span>Needed: {formatAmount(remainingNeeded)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Progress</div>
                          <div className="text-lg font-bold">{progress.toFixed(1)}%</div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                      </div>
                      
                      {/* Allocation Input */}
                      <div className="flex items-center gap-3">
                        <Label htmlFor={`allocation-${goal.id}`} className="text-sm font-medium min-w-0">
                          Allocate:
                        </Label>
                        <Input
                          id={`allocation-${goal.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          max={remainingNeeded.toString()}
                          value={allocationAmount}
                          onChange={(e) => updateGoalAllocation(goal.id, parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateGoalAllocation(goal.id, remainingNeeded)}
                          disabled={remainingNeeded <= 0}
                        >
                          Max
                        </Button>
                      </div>
                      
                      {allocationAmount > 0 && (
                        <div className="text-sm text-green-600">
                          After allocation: {formatAmount(currentAmount + allocationAmount)} / {formatAmount(targetAmount)} 
                          ({((currentAmount + allocationAmount) / targetAmount * 100).toFixed(1)}%)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMultiGoalAllocationOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmMultiGoalAllocation}
              className="bg-green-600 hover:bg-green-700"
              disabled={totalAllocated <= 0}
            >
              Allocate {formatAmount(totalAllocated)} to {Object.values(goalAllocations).filter(a => a > 0).length} Goals
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
