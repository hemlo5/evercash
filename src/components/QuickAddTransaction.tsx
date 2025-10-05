import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Integration note: Use useTransactions() from Actual to add transaction
// Call addTransaction(transactionData) with proper validation
export function QuickAddTransaction() {
  const { toast } = useToast();
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Integration: Call Actual's addTransaction here
    toast({
      title: "Transaction Added",
      description: `$${amount} at ${merchant}`,
    });
    setMerchant("");
    setAmount("");
    setCategory("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Merchant</Label>
        <Input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="Coffee shop"
          className="mt-1 bg-muted/30"
          required
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Amount</Label>
        <Input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="mt-1 bg-muted/30"
          required
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Category</Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger className="mt-1 bg-muted/30">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="glass-card border-accent/20">
            <SelectItem value="dining">Dining</SelectItem>
            <SelectItem value="shopping">Shopping</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
            <SelectItem value="utilities">Utilities</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full bg-gradient-emerald hover:opacity-90">
        <Plus className="w-4 h-4 mr-2" />
        Add Transaction
      </Button>
    </form>
  );
}
