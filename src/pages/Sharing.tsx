import { useState } from "react";
import { Users, Mail, QrCode, UserCheck, UserX, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Integration note: Use useSharedBudget() for real-time collaboration
// Implement with Supabase realtime subscriptions for live updates
export default function Sharing() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const collaborators = [
    { name: "Jane Doe", email: "jane@example.com", role: "Owner", active: true },
    { name: "Bob Smith", email: "bob@example.com", role: "Editor", active: true },
    { name: "Alice Johnson", email: "alice@example.com", role: "Viewer", active: false },
  ];

  const handleInvite = () => {
    // Integration: Call inviteCollaborator(email)
    toast({
      title: "Invite Sent",
      description: `Invitation sent to ${email}`,
    });
    setEmail("");
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-4xl font-bold mb-2">Shared Budget</h1>
        <p className="text-muted-foreground">Collaborate with family or partners</p>
      </div>

      <div className="glass-card p-8 rounded-2xl border-accent/20 space-y-6 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-bold">Invite Collaborators</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label>Email Address</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@example.com"
                className="bg-muted/30"
              />
              <Button
                onClick={handleInvite}
                className="bg-gradient-emerald hover:opacity-90 px-8"
              >
                <Mail className="w-4 h-4 mr-2" />
                Invite
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              They'll receive an email invitation to collaborate
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl border-accent/10 flex flex-col items-center justify-center">
            <QrCode className="w-24 h-24 text-accent mb-3" />
            <p className="text-sm text-center text-muted-foreground">
              Share QR code for instant access
            </p>
            <Button variant="outline" className="mt-3">
              Generate QR Code
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-8 rounded-2xl animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-6">Active Collaborators</h2>
        <div className="space-y-4">
          {collaborators.map((collab, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12 border-2 border-accent/30">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${collab.name}`} />
                  <AvatarFallback>{collab.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{collab.name}</p>
                    {collab.role === "Owner" && <Crown className="w-4 h-4 text-accent" />}
                    {collab.active && (
                      <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30">
                        <span className="w-2 h-2 rounded-full bg-accent mr-1.5 animate-pulse"></span>
                        Online
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{collab.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">{collab.role}</Badge>
                {collab.role !== "Owner" && (
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <UserX className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl border-accent/20">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-accent" />
          Permission Levels
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-3">
            <Badge variant="outline">Owner</Badge>
            <p className="text-muted-foreground">Full access, can manage collaborators</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline">Editor</Badge>
            <p className="text-muted-foreground">Can add/edit transactions and budgets</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline">Viewer</Badge>
            <p className="text-muted-foreground">Read-only access to all data</p>
          </div>
        </div>
      </div>
    </div>
  );
}
