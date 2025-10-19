import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Home, Car, Coffee, ShoppingBag, TrendingUp, TrendingDown, Target, List, Check, X, Eye, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from '@/contexts/HybridApiContext';
import { useSimpleCurrency } from "@/contexts/SimpleCurrencyContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function BudgetsTest() {
  const { api, loading } = useApi();
  const { formatAmount } = useSimpleCurrency();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [budgetData, setBudgetData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [surplusDeficit, setSurplusDeficit] = useState(0);
  const [transactionSelectOpen, setTransactionSelectOpen] = useState(false);
  const [selectedCategoryForTransactions, setSelectedCategoryForTransactions] = useState<string>("");
  const [unassignedTransactions, setUnassignedTransactions] = useState<any[]>([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [viewAllocatedOpen, setViewAllocatedOpen] = useState(false);
  const [allocatedTransactions, setAllocatedTransactions] = useState<any[]>([]);
  const [selectedForRemoval, setSelectedForRemoval] = useState<string[]>([]);

  useEffect(() => {
    loadBudgetData();
    loadAvailableCategories();
    loadTransactions();
  }, [currentMonth, api]);

  const loadAvailableCategories = async () => {
    if (!api) return;
    
    try {
      const categories = await api.getCategories();
      setAvailableCategories(Array.isArray(categories) ? categories : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadTransactions = async () => {
    if (!api) return;
    
    try {
      const startDate = `${currentMonth}-01`;
      const endDate = new Date(currentMonth + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of current month
      
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

  const loadBudgetData = async () => {
    if (!api) return;
    
    setIsLoading(true);
    try {
      console.log('Loading budget data for month:', currentMonth);
      const data = await api.getBudgetMonth(currentMonth);
      console.log('Budget data loaded:', data);
      setBudgetData(data);
    } catch (error) {
      console.error('Error loading budget data:', error);
      toast.error('Failed to load budget data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const date = new Date(currentMonth + '-01');
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    
    const newMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    setCurrentMonth(newMonth);
  };

  const handleDeleteBudget = async (categoryId: string, categoryName: string) => {
    if (!api) return;
    
    try {
      if (!confirm(`Are you sure you want to remove the budget for "${categoryName}"? This will set the budget amount to $0.`)) {
        return;
      }
      
      await api.setBudgetAmount(currentMonth, categoryId, 0);
      toast.success(`Budget for "${categoryName}" removed and hidden from view`);
      await loadBudgetData();
    } catch (error) {
      console.error('Failed to remove budget:', error);
      toast.error('Failed to remove budget');
    }
  };

  const handleBudgetUpdate = async (categoryId: string) => {
    if (!api || !editAmount) return;
    
    try {
      const amountDollars = parseFloat(editAmount);
      await api.setBudgetAmount(currentMonth, categoryId, amountDollars);
      toast.success("Budget updated successfully");
      setEditingCategory(null);
      setEditAmount("");
      await loadBudgetData();
    } catch (error) {
      console.error('Failed to update budget:', error);
      toast.error('Failed to update budget');
    }
  };

  const handleCreateBudget = async () => {
    if (!api || !selectedCategory || !newBudgetAmount) {
      toast.error('Please select a category and enter a budget amount');
      return;
    }

    const budgetAmountNum = parseFloat(newBudgetAmount);
    if (isNaN(budgetAmountNum) || budgetAmountNum <= 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }

    try {
      // Set the budget amount for this month
      await api.setBudgetAmount(currentMonth, selectedCategory, budgetAmountNum);
      
      const categoryName = availableCategories.find(cat => cat.id === selectedCategory)?.name || 'Category';
      toast.success(`Budget set for "${categoryName}": ${formatAmount(budgetAmountNum)}`);
      setCreateDialogOpen(false);
      setSelectedCategory("");
      setNewBudgetAmount("");
      await loadBudgetData();
    } catch (error) {
      console.error('Failed to set budget:', error);
      toast.error('Failed to set budget: ' + (error.message || 'Unknown error'));
    }
  };


  const handleSelectTransactions = (categoryId: string, categoryName: string) => {
    setSelectedCategoryForTransactions(categoryName);
    
    // Get all expense transactions that can be allocated to this budget category
    // This includes transactions that are either uncategorized OR categorized but not yet allocated to a budget
    const availableForBudget = transactions.filter(t => 
      t.amount < 0 && // Only expense transactions
      t.category !== categoryName // Don't show transactions already allocated to this budget
    );
    
    setUnassignedTransactions(availableForBudget);
    setSelectedTransactionIds([]);
    setTransactionSelectOpen(true);
  };

  const handleAssignTransactions = async () => {
    if (!api || selectedTransactionIds.length === 0) {
      toast.error('Please select at least one transaction');
      return;
    }

    try {
      // Update each selected transaction with the category
      for (const transactionId of selectedTransactionIds) {
        await api.updateTransaction(transactionId, {
          category: selectedCategoryForTransactions
        });
      }

      toast.success(`Allocated ${selectedTransactionIds.length} transactions to "${selectedCategoryForTransactions}" budget`);
      setTransactionSelectOpen(false);
      setSelectedTransactionIds([]);
      await loadTransactions(); // Reload to reflect changes
      await loadBudgetData(); // Reload budget data
    } catch (error) {
      console.error('Failed to assign transactions:', error);
      toast.error('Failed to assign transactions');
    }
  };

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactionIds(prev => 
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleViewAllocated = (categoryId: string, categoryName: string) => {
    setSelectedCategoryForTransactions(categoryName);
    
    // Get transactions already allocated to this budget category
    const allocated = transactions.filter(t => 
      t.amount < 0 && // Only expense transactions
      t.category === categoryName // Show transactions allocated to this budget
    );
    
    setAllocatedTransactions(allocated);
    setSelectedForRemoval([]);
    setViewAllocatedOpen(true);
  };

  const handleRemoveAllocations = async () => {
    if (!api || selectedForRemoval.length === 0) {
      toast.error('Please select at least one transaction to remove');
      return;
    }

    try {
      // Remove allocation by setting category to null or "Other"
      for (const transactionId of selectedForRemoval) {
        await api.updateTransaction(transactionId, {
          category: 'Other' // or null, depending on your system
        });
      }

      toast.success(`Removed ${selectedForRemoval.length} transactions from "${selectedCategoryForTransactions}" budget`);
      setViewAllocatedOpen(false);
      setSelectedForRemoval([]);
      await loadTransactions(); // Reload to reflect changes
      await loadBudgetData(); // Reload budget data
    } catch (error) {
      console.error('Failed to remove allocations:', error);
      toast.error('Failed to remove allocations');
    }
  };

  const toggleRemovalSelection = (transactionId: string) => {
    setSelectedForRemoval(prev => 
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

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
            const newCurrentAmount = (goal.current_amount || 0) + Math.round(amount * 100);
            await api.updateGoal(goalId, { current_amount: newCurrentAmount });
            allocatedGoals++;
          }
        }
      }
      
      toast.success(`Successfully allocated ${formatAmount(totalAllocated)} across ${allocatedGoals} goals`);
      setMultiGoalAllocationOpen(false);
      setGoalAllocations({});
      setTotalAllocated(0);
      await loadGoals();
      await loadTransactions(); // Recalculate surplus
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
      const aProgress = (a.current_amount || 0) / (a.target_amount || 1);
      const bProgress = (b.current_amount || 0) / (b.target_amount || 1);
      
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
      
      const currentAmount = (goal.current_amount || 0);
      const targetAmount = (goal.target_amount || 0);
      const remainingNeeded = Math.max(0, targetAmount - currentAmount);
      
      if (remainingNeeded > 0) {
        // Allocate up to 30% of remaining surplus or what's needed, whichever is smaller
        const suggestedAmount = Math.min(remainingSurplus * 0.3, remainingNeeded);
        suggestions[goal.id] = Math.round(suggestedAmount * 100) ; // Round to 2 decimals
        remainingSurplus -= suggestedAmount;
      }
    });

    setGoalAllocations(suggestions);
    const total = Object.values(suggestions).reduce((sum, val) => sum + val, 0);
    setTotalAllocated(total);
    toast.info(`Suggested allocation of ${formatAmount(total)} across ${Object.keys(suggestions).length} goals`);
  };

  const getIconForCategory = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('food') || name.includes('groceries')) return ShoppingBag;
    if (name.includes('dining') || name.includes('restaurant')) return Coffee;
    if (name.includes('home') || name.includes('rent')) return Home;
    if (name.includes('transport') || name.includes('car')) return Car;
    return ShoppingBag;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
          <span className="ml-2">Loading budget...</span>
        </div>
      </div>
    );
  }

  const expenseGroups = budgetData?.categoryGroups?.filter(g => !g.is_income) || [];

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-4xl font-bold mb-2">
            <span className="hidden sm:inline">Budget for {formatMonth(currentMonth)}</span>
            <span className="sm:hidden">{formatMonth(currentMonth)}</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            <span className="hidden sm:inline">Manage your spending categories</span>
            <span className="sm:hidden">Manage categories</span>
          </p>
        </div>
        
        {/* Desktop: All buttons in one row */}
        <div className="hidden md:flex gap-3">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-accent hover:bg-accent/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Set Budget
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Mobile: Stacked layout */}
        <div className="md:hidden space-y-3 w-full">
          {/* First row: Set Budget button (full width) */}
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-accent hover:bg-accent/90 w-full h-12 text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Set Budget
          </Button>
          
          {/* Second row: Previous and Next buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigateMonth('prev')}
              className="flex-1 h-12 text-sm"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => navigateMonth('next')}
              className="flex-1 h-12 text-sm"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Budget Summary */}
      <div className="glass-card p-4 md:p-6 rounded-2xl border-accent/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 mb-4">
          <h2 className="text-lg md:text-xl font-bold">Budget Overview</h2>
          {surplusDeficit > 0 && (
            <Button
              onClick={() => window.location.href = '/goals'}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm"
            >
              <Target className="w-3 h-3 md:w-4 md:h-4 mr-2" />
              <span className="hidden sm:inline">Allocate to Goals</span>
              <span className="sm:hidden">Allocate</span>
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
          <div className="text-center p-3 md:p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200/20 dark:border-blue-700/30">
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Budgeted</p>
            <p className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">{formatAmount((budgetData?.totalBudgeted || 0))}</p>
          </div>
          <div className="text-center p-3 md:p-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200/20 dark:border-red-700/30">
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Spent</p>
            <p className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">{formatAmount((budgetData?.totalSpent || 0))}</p>
          </div>
          <div className="text-center p-3 md:p-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200/20 dark:border-green-700/30">
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Income</p>
            <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">{formatAmount((budgetData?.totalIncome || 0))}</p>
          </div>
          <div className="text-center p-3 md:p-4 rounded-lg bg-purple-50 dark:bg-purple-900/30 border border-purple-200/20 dark:border-purple-700/30">
            <p className="text-xs md:text-sm text-muted-foreground mb-1">Available</p>
            <p className="text-lg md:text-2xl font-bold text-purple-600 dark:text-purple-400">{formatAmount((budgetData?.toBudget || 0))}</p>
          </div>
          <div className={`text-center p-3 md:p-4 rounded-lg border col-span-2 sm:col-span-1 ${surplusDeficit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200/20 dark:border-emerald-700/30' : 'bg-orange-50 dark:bg-orange-900/30 border-orange-200/20 dark:border-orange-700/30'}`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              {surplusDeficit >= 0 ? (
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-orange-600 dark:text-orange-400" />
              )}
              <p className="text-xs md:text-sm text-muted-foreground">
                {surplusDeficit >= 0 ? 'Surplus' : 'Deficit'}
              </p>
            </div>
            <p className={`text-lg md:text-2xl font-bold ${surplusDeficit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {formatAmount(Math.abs(surplusDeficit))}
            </p>
          </div>
        </div>
      </div>

      {/* Category Groups */}
      <div className="space-y-6">
        {expenseGroups.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Budget Categories Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Get started by creating your first budget category. Track your spending and stay on top of your finances.
            </p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-accent hover:bg-accent/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Set Your First Budget
            </Button>
          </div>
        ) : (
          expenseGroups.map((group) => (
            <div key={group.id} className="glass-card p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-4">{group.name}</h3>
              <div className="space-y-3">
                {(group.categories || [])
                  .filter(category => (category.budgeted || 0) > 0)
                  .map((category) => {
                  const budgeted = (category.budgeted || 0);
                  const spent = Math.abs((category.spent || 0));
                  const remaining = budgeted - spent;
                  const percentSpent = budgeted > 0 ? (spent / budgeted) * 100 : 0;
                  const Icon = getIconForCategory(category.name);
                  
                  // Calculate actual spending from transactions for this category
                  const categoryTransactions = transactions.filter(t => 
                    t.category === category.name && t.amount < 0
                  );
                  const actualSpent = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
                  const budgetPerformance = budgeted > 0 ? ((budgeted - actualSpent) / budgeted) * 100 : 0;
                  
                  return (
                    <div key={category.id} className="p-4 rounded-lg border border-border/50 hover:border-accent/30 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-lg ${
                            budgetPerformance >= 0 ? 
                            'bg-gradient-to-br from-green-500/20 to-green-400/30 shadow-[0_0_10px_rgba(0,255,0,0.2)]' :
                            'bg-gradient-to-br from-red-500/20 to-red-400/30 shadow-[0_0_10px_rgba(255,0,0,0.2)]'
                          }`}>
                            <Icon className={`w-5 h-5 ${budgetPerformance >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                          </div>
                          <div>
                            <h4 className="font-medium">{category.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Spent: {formatAmount(actualSpent)} / Budget: {formatAmount(budgeted)}
                            </p>
                            <p className={`text-xs font-medium ${budgetPerformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {budgetPerformance >= 0 ? 
                                `Under budget by ${formatAmount((budgeted - actualSpent))}` :
                                `Over budget by ${formatAmount((actualSpent - budgeted))}`
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className={`text-sm font-medium ${budgetPerformance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {budgetPerformance >= 0 ? '✓ On Track' : '⚠ Over Budget'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Math.abs(budgetPerformance).toFixed(1)}% {budgetPerformance >= 0 ? 'saved' : 'over'}
                            </div>
                          </div>
                          {editingCategory === category.id ? (
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-24 h-8"
                                placeholder="0.00"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleBudgetUpdate(category.id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCategory(null);
                                  setEditAmount("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSelectTransactions(category.id, category.name)}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                                title="Allocate transactions to this budget category"
                              >
                                <List className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewAllocated(category.id, category.name)}
                                className="text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                title="View and manage allocated transactions"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingCategory(category.id);
                                  setEditAmount(budgeted.toString());
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteBudget(category.id, category.name)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            percentSpent > 100 ? 'bg-red-500' : 
                            percentSpent > 80 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentSpent, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Budget Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Budget Amount</DialogTitle>
            <DialogDescription>
              Choose a category and set your budget amount for {formatMonth(currentMonth)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="categorySelect">Select Category</Label>
              <select
                id="categorySelect"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">Choose a category...</option>
                {availableCategories
                  .filter(cat => !cat.is_income)
                  .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="budgetAmount">Budget Amount</Label>
              <Input
                id="budgetAmount"
                type="number"
                step="0.01"
                min="0"
                value={newBudgetAmount}
                onChange={(e) => setNewBudgetAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How much do you want to budget for this category this month?
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBudget}>
              Set Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Transaction Selection Dialog */}
      <Dialog open={transactionSelectOpen} onOpenChange={setTransactionSelectOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Allocate Transactions to Budget</DialogTitle>
            <DialogDescription>
              Select expense transactions to allocate to this budget category. 
              You can allocate any expense transaction to track it against this budget.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {unassignedTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No transactions available for this budget.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  All expense transactions are already allocated to this budget category.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {unassignedTransactions.length} transactions available for allocation
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTransactionIds(unassignedTransactions.map(t => t.id))}
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTransactionIds([])}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                {unassignedTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTransactionIds.includes(transaction.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-border hover:border-accent/50'
                    }`}
                    onClick={() => toggleTransactionSelection(transaction.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          selectedTransactionIds.includes(transaction.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedTransactionIds.includes(transaction.id) && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.payee || 'Unknown Payee'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()} • {transaction.account || 'Unknown Account'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">
                          -{formatAmount(Math.abs(transaction.amount) )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.category || 'Uncategorized'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransactionSelectOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignTransactions}
              disabled={selectedTransactionIds.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Allocate {selectedTransactionIds.length} Transaction{selectedTransactionIds.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Allocated Transactions Dialog */}
      <Dialog open={viewAllocatedOpen} onOpenChange={setViewAllocatedOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Allocated Transactions</DialogTitle>
            <DialogDescription>
              View and remove transactions currently allocated to "{selectedCategoryForTransactions}" budget category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {allocatedTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No transactions allocated to this budget yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use the "Allocate Transactions" button to add transactions to this budget.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {allocatedTransactions.length} transactions allocated to this budget
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedForRemoval(allocatedTransactions.map(t => t.id))}
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedForRemoval([])}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                {allocatedTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedForRemoval.includes(transaction.id)
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                        : 'border-border hover:border-accent/50'
                    }`}
                    onClick={() => toggleRemovalSelection(transaction.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          selectedForRemoval.includes(transaction.id)
                            ? 'border-red-500 bg-red-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedForRemoval.includes(transaction.id) && (
                            <Minus className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.payee || 'Unknown Payee'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()} • {transaction.account || 'Unknown Account'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">
                          -{formatAmount(Math.abs(transaction.amount) )}
                        </p>
                        <p className="text-xs text-green-600 font-medium">
                          Allocated to {selectedCategoryForTransactions}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewAllocatedOpen(false)}>
              Close
            </Button>
            {selectedForRemoval.length > 0 && (
              <Button 
                onClick={handleRemoveAllocations}
                className="bg-red-600 hover:bg-red-700"
              >
                Remove {selectedForRemoval.length} Allocation{selectedForRemoval.length !== 1 ? 's' : ''}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
