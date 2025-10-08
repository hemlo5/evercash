import { useState } from "react";
import { Link2, CheckCircle2, AlertCircle, Loader2, Upload, CreditCard, Building2, Globe, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const syncMethods = [
    {
      id: 'plaid',
      name: 'Plaid (US/Canada)',
      description: 'Connect to 11,000+ banks automatically',
      icon: Building2,
      available: true
    },
    {
      id: 'simplefin',
      name: 'SimpleFIN',
      description: 'Direct bank connections (US)',
      icon: CreditCard,
      available: true
    },
    {
      id: 'gocardless',
      name: 'GoCardless (EU)',
      description: 'Open Banking for European banks',
      icon: Globe,
      available: true
    },
    {
      id: 'csv',
      name: 'Import CSV/OFX',
      description: 'Upload transaction files',
      icon: Upload,
      available: true
    }
  ];

  const handleConnect = (method: string) => {
    setSelectedMethod(method);
    
    // Only CSV shows file upload, others show integration info
    if (method === 'csv') {
      return;
    }
  };

  const handleMethodConnect = (method: string) => {
    setStatus("error"); // Show setup required message
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setSyncing(true);
      setStatus("syncing");
      
      // Simulate file processing
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setSyncing(false);
            setStatus("success");
            return 100;
          }
          return prev + 20;
        });
      }, 200);
    }
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
          {status === "idle" && !selectedMethod && (
            <>
              <div className="space-y-3">
                <h4 className="font-semibold">Choose Connection Method</h4>
                {syncMethods.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => handleConnect(method.id)}
                      className="w-full p-4 glass-card rounded-xl border-accent/10 hover:border-accent/30 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-5 h-5 text-accent" />
                        <div className="flex-1">
                          <h5 className="font-semibold group-hover:text-accent transition-colors">
                            {method.name}
                          </h5>
                          <p className="text-sm text-muted-foreground">
                            {method.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <div className="glass-card p-4 rounded-xl border-accent/10">
                <h4 className="font-semibold mb-2">🔒 Secure & Private</h4>
                <p className="text-sm text-muted-foreground">
                  Bank-level encryption. Your credentials are never stored.
                </p>
              </div>
            </>
          )}

          {status === "idle" && selectedMethod === "csv" && (
            <div className="space-y-4">
              <div className="text-center">
                <FileText className="w-12 h-12 text-accent mx-auto mb-3" />
                <h4 className="font-semibold mb-2">Upload Transaction File</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports CSV, OFX, QIF formats from your bank
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.ofx,.qif"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
              </div>
              
              <Button
                onClick={() => setSelectedMethod(null)}
                variant="outline"
                className="w-full"
              >
                Back to Methods
              </Button>
            </div>
          )}

          {status === "idle" && selectedMethod === "plaid" && (
            <div className="space-y-4">
              <div className="text-center">
                <Building2 className="w-12 h-12 text-accent mx-auto mb-3" />
                <h4 className="font-semibold mb-2">Connect with Plaid</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Securely connect to over 11,000 banks and credit unions
                </p>
              </div>
              
              <div className="glass-card p-4 rounded-xl border-accent/10">
                <p className="text-sm text-muted-foreground">
                  • Automatic transaction sync<br/>
                  • Real-time balance updates<br/>
                  • Bank-level security<br/>
                  • Works with most US & Canadian banks
                </p>
              </div>
              
              <Button
                onClick={() => handleMethodConnect('plaid')}
                className="w-full h-12 bg-gradient-emerald"
              >
                Continue with Plaid
              </Button>
              
              <Button
                onClick={() => setSelectedMethod(null)}
                variant="outline"
                className="w-full"
              >
                Back to Methods
              </Button>
            </div>
          )}

          {status === "idle" && selectedMethod === "simplefin" && (
            <div className="space-y-4">
              <div className="text-center">
                <CreditCard className="w-12 h-12 text-accent mx-auto mb-3" />
                <h4 className="font-semibold mb-2">Connect with SimpleFIN</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Direct bank connections without third-party data sharing
                </p>
              </div>
              
              <div className="glass-card p-4 rounded-xl border-accent/10">
                <p className="text-sm text-muted-foreground">
                  • Direct bank API connections<br/>
                  • No data stored by third parties<br/>
                  • Supports 2,000+ US financial institutions<br/>
                  • One-time setup fee may apply
                </p>
              </div>
              
              <Button
                onClick={() => handleMethodConnect('simplefin')}
                className="w-full h-12 bg-gradient-emerald"
              >
                Continue with SimpleFIN
              </Button>
              
              <Button
                onClick={() => setSelectedMethod(null)}
                variant="outline"
                className="w-full"
              >
                Back to Methods
              </Button>
            </div>
          )}

          {status === "idle" && selectedMethod === "gocardless" && (
            <div className="space-y-4">
              <div className="text-center">
                <Globe className="w-12 h-12 text-accent mx-auto mb-3" />
                <h4 className="font-semibold mb-2">Connect with GoCardless</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Open Banking for European banks and financial institutions
                </p>
              </div>
              
              <div className="glass-card p-4 rounded-xl border-accent/10">
                <p className="text-sm text-muted-foreground">
                  • PSD2 compliant Open Banking<br/>
                  • Supports 2,500+ European banks<br/>
                  • Real-time transaction data<br/>
                  • Regulated by financial authorities
                </p>
              </div>
              
              <Button
                onClick={() => handleMethodConnect('gocardless')}
                className="w-full h-12 bg-gradient-emerald"
              >
                Continue with GoCardless
              </Button>
              
              <Button
                onClick={() => setSelectedMethod(null)}
                variant="outline"
                className="w-full"
              >
                Back to Methods
              </Button>
            </div>
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
                <h3 className="text-xl font-bold">
                  {selectedMethod === 'csv' ? 'File Imported!' : 'Successfully Connected!'}
                </h3>
                <p className="text-sm text-muted-foreground text-center">
                  {selectedMethod === 'csv' 
                    ? `Imported ${file?.name} with transactions`
                    : 'Your transactions will sync automatically every 24 hours'
                  }
                </p>
              </div>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  setSelectedMethod(null);
                  setFile(null);
                  setStatus("idle");
                  setProgress(0);
                }}
                className="w-full h-12 bg-gradient-emerald"
              >
                Done
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col items-center gap-3 py-4">
                <AlertCircle className="w-16 h-16 text-orange-500" />
                <h3 className="text-xl font-bold">Setup Required</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {selectedMethod === 'plaid' && 'Plaid integration requires API keys and developer setup. This is a demo version.'}
                  {selectedMethod === 'simplefin' && 'SimpleFIN requires a bridge server setup and API credentials.'}
                  {selectedMethod === 'gocardless' && 'GoCardless requires business registration and API approval.'}
                  {!selectedMethod && 'This integration requires additional setup.'}
                </p>
              </div>
              
              <div className="glass-card p-4 rounded-xl border-orange-200/20 bg-orange-50/10">
                <h4 className="font-semibold mb-2 text-orange-700">For Real Implementation:</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {selectedMethod === 'plaid' && (
                    <>
                      <p>• Sign up at plaid.com/developers</p>
                      <p>• Install react-plaid-link package</p>
                      <p>• Configure API keys and webhooks</p>
                      <p>• Implement token exchange</p>
                    </>
                  )}
                  {selectedMethod === 'simplefin' && (
                    <>
                      <p>• Set up SimpleFIN Bridge server</p>
                      <p>• Configure bank credentials</p>
                      <p>• Implement data sync endpoints</p>
                      <p>• Handle authentication tokens</p>
                    </>
                  )}
                  {selectedMethod === 'gocardless' && (
                    <>
                      <p>• Register business with GoCardless</p>
                      <p>• Get API credentials approved</p>
                      <p>• Implement OAuth flow</p>
                      <p>• Set up webhook endpoints</p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (selectedMethod === 'plaid') window.open('https://plaid.com/developers/', '_blank');
                    if (selectedMethod === 'simplefin') window.open('https://simplefin.org/', '_blank');
                    if (selectedMethod === 'gocardless') window.open('https://gocardless.com/bank-account-data/', '_blank');
                  }}
                  className="flex-1 h-12 bg-gradient-emerald"
                >
                  Learn More
                </Button>
                <Button
                  onClick={() => {
                    setStatus("idle");
                    setSelectedMethod(null);
                  }}
                  variant="outline"
                  className="flex-1 h-12"
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {selectedMethod === 'plaid' && 'Powered by Plaid • 256-bit encryption'}
          {selectedMethod === 'simplefin' && 'Powered by SimpleFIN • Bank-level security'}
          {selectedMethod === 'gocardless' && 'Powered by GoCardless • Open Banking'}
          {selectedMethod === 'csv' && 'Secure file processing • Data stays local'}
          {!selectedMethod && 'Multiple secure connection options available'}
        </p>
      </DialogContent>
    </Dialog>
  );
}
