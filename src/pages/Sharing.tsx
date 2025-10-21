import { useState, useEffect } from "react";
import { Users, Mail, QrCode, UserCheck, UserX, Crown, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/contexts/HybridApiContext";
import { useNavigate } from "react-router-dom";
import { sanitizeEmail } from "@/lib/sanitize";
import { toast } from "sonner";

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Editor' | 'Viewer';
  active: boolean;
  avatar?: string;
}

export default function Sharing() {
  const { api } = useApi();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (api) {
      loadSharingData();
    }
  }, [api]);

  const loadSharingData = async () => {
    if (!api) return;
    
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from the sharing API
      // For now, we'll simulate with mock data that represents potential Actual Budget sharing
      const mockCollaborators: Collaborator[] = [
        { 
          id: '1',
          name: "You", 
          email: "user@example.com", 
          role: "Owner", 
          active: true,
          avatar: undefined
        }
      ];
      
      // Check if there are any shared budget configurations
      // This would typically come from Actual Budget's sync server
      console.log('Loading sharing data from Actual Budget sync server...');
      
      setCollaborators(mockCollaborators);
    } catch (error) {
      console.error('Failed to load sharing data:', error);
      toast.error('Failed to load sharing data');
      
      // Fallback to mock data
      setCollaborators([
        { id: '1', name: "You", email: "user@example.com", role: "Owner", active: true },
        { id: '2', name: "Jane Doe", email: "jane@example.com", role: "Editor", active: true },
        { id: '3', name: "Bob Smith", email: "bob@example.com", role: "Viewer", active: false },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!email || !api) return;
    
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setIsInviting(true);
    try {
      // In a real implementation, this would call the Actual Budget sharing API
      // For now, we simulate the invitation process
      console.log('Inviting user to shared budget:', sanitizedEmail);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add the new collaborator to the list (simulated)
      const newCollaborator: Collaborator = {
        id: Date.now().toString(),
        name: sanitizedEmail.split('@')[0],
        email: sanitizedEmail,
        role: 'Viewer',
        active: false // Pending invitation
      };
      
      setCollaborators(prev => [...prev, newCollaborator]);
      
      toast.success(`Invitation sent to ${sanitizedEmail}`);
      setEmail("");
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      // In a real implementation, this would call the API to remove access
      setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
      toast.success('Collaborator removed');
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading sharing settings...</span>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-4xl relative">
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
      {/* Locked overlay */}
      <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md flex items-center justify-center">
        <button
          aria-label="Close"
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 p-2 rounded-full bg-background/70 border border-border hover:bg-accent/10 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="glass-card border border-accent/20 rounded-2xl p-8 md:p-10 text-center shadow-2xl">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Lock className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            This feature will be available within a few days.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">— Regards, Evercash</p>
        </div>
      </div>
    </div>
  );
}
