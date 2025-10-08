import { useState, useEffect } from "react";
import { useApi } from "@/contexts/ApiContext";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Building2, 
  CreditCard, 
  Wallet, 
  PiggyBank,
  TrendingUp,
  Lock,
  Unlock,
  RefreshCw,
  MoreHorizontal,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { Account } from "@/lib/api";

interface AccountFormData {
  name: string;
  type: string;
  offbudget: boolean;
  initialBalance?: number;
}

const accountTypeIcons = {
  checking: Building2,
  savings: PiggyBank,
  credit: CreditCard,
  investment: TrendingUp,
  other: Wallet,
};

export default function Accounts() {
  const { api, loading } = useApi();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    name: "",
    type: "checking",
    offbudget: false,
    initialBalance: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (api) {
      loadAccounts();
    }
  }, [api]);

  const loadAccounts = async () => {
    if (!api) return;
    
    setIsLoading(true);
    try {
      const data = await api.getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error("Error loading accounts:", error);
      toast.error("Failed to load accounts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!api) return;
    
    if (!formData.name.trim()) {
      toast.error("Please enter an account name");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createAccount(
        {
          name: formData.name,
          type: formData.type,
          offbudget: formData.offbudget,
          balance: formData.initialBalance ? formData.initialBalance * 100 : 0, // Convert to cents
        }
      );
      
      toast.success("Account created successfully");
      setCreateDialogOpen(false);
      setFormData({
        name: "",
        type: "checking",
        offbudget: false,
        initialBalance: 0,
      });
      await loadAccounts();
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!api || !selectedAccount) return;
    
    if (!formData.name.trim()) {
      toast.error("Please enter an account name");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateAccount(selectedAccount.id, {
        name: formData.name,
        type: formData.type,
        offbudget: formData.offbudget,
      });
      
      toast.success("Account updated successfully");
      setEditDialogOpen(false);
      setSelectedAccount(null);
      await loadAccounts();
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error("Failed to update account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!api || !selectedAccount) return;
    
    setIsSubmitting(true);
    try {
      await api.deleteAccount(selectedAccount.id);
      toast.success("Account deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedAccount(null);
      await loadAccounts();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAccount = async (account: Account) => {
    if (!api) return;
    
    try {
      await api.closeAccount(account.id);
      toast.success("Account closed successfully");
      await loadAccounts();
    } catch (error) {
      console.error("Error closing account:", error);
      toast.error("Failed to close account");
    }
  };

  const handleReopenAccount = async (account: Account) => {
    if (!api) return;
    
    try {
      await api.reopenAccount(account.id);
      toast.success("Account reopened successfully");
      await loadAccounts();
    } catch (error) {
      console.error("Error reopening account:", error);
      toast.error("Failed to reopen account");
    }
  };

  const handleReconcile = async (account: Account) => {
    if (!api) return;
    
    try {
      // TODO: Implement reconciliation UI
      toast.info("Reconciliation feature coming soon");
    } catch (error) {
      console.error("Error reconciling account:", error);
      toast.error("Failed to reconcile account");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100); // Convert from cents
  };

  const openEditDialog = (account: Account) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      offbudget: account.offbudget,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (account: Account) => {
    setSelectedAccount(account);
    setDeleteDialogOpen(true);
  };

  if (loading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading accounts...</span>
      </div>
    );
  }

  const openAccounts = accounts.filter(a => !a.closed);
  const closedAccounts = accounts.filter(a => a.closed);
  const totalBalance = openAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Accounts</h1>
          <p className="text-muted-foreground">
            Manage your financial accounts and track balances
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-gradient-emerald hover:opacity-90"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Total Balance</CardTitle>
          <CardDescription>Across all open accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-emerald-600">
            {formatCurrency(totalBalance)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {openAccounts.length} open {openAccounts.length === 1 ? 'account' : 'accounts'}
          </p>
        </CardContent>
      </Card>

      {/* Open Accounts */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Open Accounts</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {openAccounts.map((account) => {
            const Icon = accountTypeIcons[account.type as keyof typeof accountTypeIcons] || Wallet;
            
            return (
              <Card key={account.id} className="glass-card hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-emerald flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                      <CardDescription className="capitalize">{account.type}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(account)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleReconcile(account)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reconcile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleCloseAccount(account)}>
                        <Lock className="w-4 h-4 mr-2" />
                        Close Account
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => openDeleteDialog(account)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Balance</span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(account.balance || 0)}
                      </span>
                    </div>
                    {account.offbudget && (
                      <div className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 rounded px-2 py-1 inline-block">
                        Off-budget
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Closed Accounts */}
      {closedAccounts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Closed Accounts</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {closedAccounts.map((account) => {
              const Icon = accountTypeIcons[account.type as keyof typeof accountTypeIcons] || Wallet;
              
              return (
                <Card key={account.id} className="opacity-60">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{account.name}</CardTitle>
                        <CardDescription>Closed</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleReopenAccount(account)}>
                          <Unlock className="w-4 h-4 mr-2" />
                          Reopen
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(account)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Account Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>
              Add a new financial account to track your money
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Checking"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Account Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="checking" id="checking" />
                  <Label htmlFor="checking">Checking</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="savings" id="savings" />
                  <Label htmlFor="savings">Savings</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit" id="credit" />
                  <Label htmlFor="credit">Credit Card</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="investment" id="investment" />
                  <Label htmlFor="investment">Investment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="balance">Initial Balance (optional)</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={formData.initialBalance}
                onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="offbudget"
                checked={formData.offbudget}
                onCheckedChange={(checked) => setFormData({ ...formData, offbudget: checked })}
              />
              <Label htmlFor="offbudget">Off-budget account</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAccount} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update account information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Account Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Account Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="checking" id="edit-checking" />
                  <Label htmlFor="edit-checking">Checking</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="savings" id="edit-savings" />
                  <Label htmlFor="edit-savings">Savings</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit" id="edit-credit" />
                  <Label htmlFor="edit-credit">Credit Card</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="investment" id="edit-investment" />
                  <Label htmlFor="edit-investment">Investment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="edit-other" />
                  <Label htmlFor="edit-other">Other</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-offbudget"
                checked={formData.offbudget}
                onCheckedChange={(checked) => setFormData({ ...formData, offbudget: checked })}
              />
              <Label htmlFor="edit-offbudget">Off-budget account</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAccount} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedAccount?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
