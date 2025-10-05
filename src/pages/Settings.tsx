import { User, Shield, Database, CreditCard, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="glass-card p-8 rounded-2xl space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-bold">Profile Information</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              defaultValue="John Doe"
              className="mt-2 bg-muted/30 border-border/50"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              defaultValue="john.doe@example.com"
              className="mt-2 bg-muted/30 border-border/50"
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-8 rounded-2xl space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-bold">Privacy & Security</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive updates about your budget</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      <div className="glass-card p-8 rounded-2xl space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-bold">Data Management</h2>
        </div>
        
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start h-12">
            Export All Data
          </Button>
          <Button variant="outline" className="w-full justify-start h-12">
            Import from CSV
          </Button>
          <Button variant="outline" className="w-full justify-start h-12 text-destructive border-destructive hover:bg-destructive hover:text-white">
            Delete All Data
          </Button>
        </div>
      </div>

      <div className="glass-card p-8 rounded-2xl border-accent/30 animate-fade-in-up relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-emerald-subtle opacity-20"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="w-6 h-6 text-accent animate-glow-pulse" />
            <h2 className="text-2xl font-bold">Upgrade to Premium</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Unlock advanced features including AI-powered insights, unlimited envelopes, and priority support.
          </p>
          <Button className="bg-gradient-emerald hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]">
            <CreditCard className="w-5 h-5 mr-2" />
            Upgrade Now
          </Button>
        </div>
      </div>
    </div>
  );
}
