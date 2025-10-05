import { useState } from "react";
import { Link2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface BankSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Integration note: Replace with actual Plaid Link SDK
// Use usePlaidLink() hook from react-plaid-link
export function BankSyncModal({ open, onOpenChange }: BankSyncModalProps) {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");

  const handleConnect = () => {
    setSyncing(true);
    setStatus("syncing");
    // Simulate sync progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setSyncing(false);
          setStatus("success");
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-accent/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Link2 className="w-6 h-6 text-accent" />
            Connect Your Bank
          </DialogTitle>
          <DialogDescription>
            Securely link your bank account for automatic transaction imports
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {status === "idle" && (
            <>
              <div className="glass-card p-4 rounded-xl border-accent/10">
                <h4 className="font-semibold mb-2">Secure & Private</h4>
                <p className="text-sm text-muted-foreground">
                  We use bank-level encryption. Your credentials are never stored.
                </p>
              </div>
              <Button
                onClick={handleConnect}
                className="w-full h-12 bg-gradient-emerald hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                aria-label="Connect bank account"
              >
                <Link2 className="w-5 h-5 mr-2" />
                Connect Bank Account
              </Button>
            </>
          )}

          {status === "syncing" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-accent animate-spin" />
                <span className="font-semibold">Syncing transactions...</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Importing your recent transactions
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4 animate-scale-in">
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 className="w-16 h-16 text-accent animate-glow-pulse" />
                <h3 className="text-xl font-bold">Successfully Connected!</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Your transactions will sync automatically every 24 hours
                </p>
              </div>
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full h-12 bg-gradient-emerald"
              >
                Done
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col items-center gap-3 py-4">
                <AlertCircle className="w-16 h-16 text-destructive" />
                <h3 className="text-xl font-bold">Connection Failed</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Please try again or contact support
                </p>
              </div>
              <Button
                onClick={() => setStatus("idle")}
                variant="outline"
                className="w-full h-12"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Powered by Plaid • 256-bit encryption
        </p>
      </DialogContent>
    </Dialog>
  );
}
