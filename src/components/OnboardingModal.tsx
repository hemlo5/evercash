import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, Sparkles, Plus, X, Upload, FileText } from "lucide-react";
import { saveOnboardingData, updateUserProfile } from "@/lib/supabase-client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface ExpenseCategory {
  id: string;
  category: string;
  amount: number;
}

interface FormData {
  name: string;
  income: string;
  savingsGoal: string;
  customGoal: string;
  goalAmount: number;
  expenseCategories: ExpenseCategory[];
  importType: string;
}

export default function OnboardingModal({
  open,
  onOpenChange,
  onComplete,
}: OnboardingModalProps) {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: user?.user_metadata?.full_name || "",
    income: "",
    savingsGoal: "",
    customGoal: "",
    goalAmount: 5000,
    expenseCategories: [],
    importType: "",
  });

  const [newCategory, setNewCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const updateFormData = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addExpenseCategory = () => {
    if (newCategory.trim() && newAmount) {
      const category: ExpenseCategory = {
        id: Date.now().toString(),
        category: newCategory.trim(),
        amount: parseInt(newAmount),
      };
      setFormData((prev) => ({
        ...prev,
        expenseCategories: [...prev.expenseCategories, category],
      }));
      setNewCategory("");
      setNewAmount("");
    }
  };

  const removeExpenseCategory = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      expenseCategories: prev.expenseCategories.filter((cat) => cat.id !== id),
    }));
  };

  const addPresetCategory = (category: string) => {
    const exists = formData.expenseCategories.find((cat) => cat.category === category);
    if (!exists) {
      const newCat: ExpenseCategory = {
        id: Date.now().toString(),
        category,
        amount: 0,
      };
      setFormData((prev) => ({
        ...prev,
        expenseCategories: [...prev.expenseCategories, newCat],
      }));
    }
  };

  const updateCategoryAmount = (id: string, amount: number) => {
    setFormData((prev) => ({
      ...prev,
      expenseCategories: prev.expenseCategories.map((cat) =>
        cat.id === id ? { ...cat, amount } : cat
      ),
    }));
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    setIsSubmitting(true);
    try {
      // Save onboarding data to Supabase
      const onboardingData = {
        user_id: user.id,
        name: formData.name,
        income_range: formData.income,
        savings_goal: formData.savingsGoal || formData.customGoal,
        custom_goal: formData.savingsGoal === "custom" ? formData.customGoal : undefined,
        goal_amount: formData.goalAmount,
        expense_categories: formData.expenseCategories,
        import_type: formData.importType,
      };

      await saveOnboardingData(onboardingData);

      // Mark onboarding as completed
      await updateUserProfile(user.id, { onboarding_completed: true });
      await refreshProfile();

      toast.success("Welcome to EVERCASH! 🎉");
      onOpenChange(false);
      onComplete();
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      toast.error("Failed to save your information. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name.trim() !== "";
      case 2:
        return formData.income !== "";
      case 3:
        return (formData.savingsGoal !== "" || formData.customGoal.trim() !== "") && formData.goalAmount > 0;
      case 4:
        return formData.expenseCategories.length > 0;
      case 5:
        return true; // Optional step
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Let&apos;s personalize your experience
          </DialogTitle>
          <DialogDescription>
            Help us understand your financial goals
          </DialogDescription>
        </DialogHeader>

        <div className="mb-6">
          <Progress value={progress} className="h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            Step {step} of {totalSteps}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    What&apos;s your name?
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                  />
                </div>
                <div className="rounded-lg bg-primary/10 p-4">
                  <p className="text-sm">
                    <Sparkles className="mb-1 inline h-4 w-4 text-primary" />{" "}
                    We&apos;ll use this to personalize your dashboard
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="income">
                    What&apos;s your monthly income range?
                  </Label>
                  <Select
                    value={formData.income}
                    onValueChange={(value) => updateFormData("income", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select income range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-2k">Under $2,000</SelectItem>
                      <SelectItem value="2k-4k">$2,000 - $4,000</SelectItem>
                      <SelectItem value="4k-6k">$4,000 - $6,000</SelectItem>
                      <SelectItem value="6k-8k">$6,000 - $8,000</SelectItem>
                      <SelectItem value="over-8k">Over $8,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg bg-primary/10 p-4">
                  <p className="text-sm">
                    <Sparkles className="mb-1 inline h-4 w-4 text-primary" />{" "}
                    We'll use this to suggest budget allocations
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="savingsGoal">
                    What&apos;s your primary savings goal?
                  </Label>
                  <Select
                    value={formData.savingsGoal}
                    onValueChange={(value) => {
                      updateFormData("savingsGoal", value);
                      if (value !== "custom") {
                        updateFormData("customGoal", "");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emergency-fund">
                        Emergency Fund
                      </SelectItem>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="home-purchase">
                        Home Purchase
                      </SelectItem>
                      <SelectItem value="retirement">Retirement</SelectItem>
                      <SelectItem value="debt-payoff">Debt Payoff</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="custom">Custom Goal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.savingsGoal === "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="customGoal">
                      Enter your custom goal
                    </Label>
                    <Input
                      id="customGoal"
                      placeholder="e.g., Wedding, Car, Education"
                      value={formData.customGoal}
                      onChange={(e) => updateFormData("customGoal", e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>
                    Target amount: ${formData.goalAmount.toLocaleString()}
                  </Label>
                  <Slider
                    value={[formData.goalAmount]}
                    onValueChange={([value]) =>
                      updateFormData("goalAmount", value)
                    }
                    min={1000}
                    max={100000}
                    step={1000}
                    className="py-4"
                  />
                </div>

                <div className="rounded-lg bg-primary/10 p-4">
                  <p className="text-sm">
                    <Sparkles className="mb-1 inline h-4 w-4 text-primary" />{" "}
                    AI will create a personalized savings plan for you
                  </p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    What are your monthly expenses?
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Add categories and amounts to track your spending
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Quick Add:</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Bills & Utilities",
                      "Transportation",
                      "Food & Dining",
                      "Entertainment",
                      "Healthcare",
                      "Shopping",
                    ].map((cat) => (
                      <Button
                        key={cat}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addPresetCategory(cat)}
                        className="text-xs"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Custom Category:</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Category name"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="w-24"
                    />
                    <Button
                      type="button"
                      onClick={addExpenseCategory}
                      size="sm"
                      disabled={!newCategory.trim() || !newAmount}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {formData.expenseCategories.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border p-3">
                    <Label className="text-sm">Your Expenses:</Label>
                    {formData.expenseCategories.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2">
                        <span className="text-sm flex-1">{cat.category}</span>
                        <Input
                          type="number"
                          value={cat.amount || ""}
                          onChange={(e) => updateCategoryAmount(cat.id, parseInt(e.target.value) || 0)}
                          className="w-24 h-8 text-sm"
                          placeholder="$0"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExpenseCategory(cat.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="pt-2 border-t mt-2">
                      <p className="text-sm font-semibold">
                        Total: ${formData.expenseCategories.reduce((sum, cat) => sum + cat.amount, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    Do you want to import existing transactions?
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    You can upload your bank statements or skip this step
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={formData.importType === "csv" ? "default" : "outline"}
                    className="h-auto flex-col gap-2 p-4"
                    onClick={() => updateFormData("importType", formData.importType === "csv" ? "" : "csv")}
                  >
                    <FileText className="h-8 w-8" />
                    <div className="text-center">
                      <p className="font-semibold">CSV File</p>
                      <p className="text-xs text-muted-foreground">Bank statements</p>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant={formData.importType === "pdf" ? "default" : "outline"}
                    className="h-auto flex-col gap-2 p-4"
                    onClick={() => updateFormData("importType", formData.importType === "pdf" ? "" : "pdf")}
                  >
                    <Upload className="h-8 w-8" />
                    <div className="text-center">
                      <p className="font-semibold">PDF File</p>
                      <p className="text-xs text-muted-foreground">AI extraction</p>
                    </div>
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => updateFormData("importType", "skip")}
                >
                  Skip - I&apos;ll add transactions manually
                </Button>

                <div className="space-y-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 p-4">
                  <p className="font-semibold">
                    You&apos;re all set! 🎉
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Based on your responses, we&apos;ll create a personalized
                    budget plan with AI-powered insights.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between gap-3 pt-4">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isSubmitting}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed() || isSubmitting}
              className="ml-auto"
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="ml-auto"
            >
              {isSubmitting ? "Setting up..." : "Get Started"}
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
