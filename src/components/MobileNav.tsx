import { useState } from "react";
import {
  Building2,
  Upload,
  Link2,
  Users,
  Settings,
  Menu,
  X
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

// Secondary navigation items - main pages are handled by bottom navigation
const navItems = [
  { title: "Accounts", url: "/accounts", icon: Building2 },
  { title: "Import", url: "/import", icon: Upload },
  { title: "Bank Sync", url: "/bank-sync", icon: Link2 },
  { title: "Sharing", url: "/sharing", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ isOpen, onClose }: MobileNavProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sliding drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-background text-foreground shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-400 flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(0,255,0,0.4)] text-black">
              EC
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground dark:bg-gradient-to-r dark:from-emerald-400 dark:to-emerald-600 dark:bg-clip-text dark:text-transparent">EVERCASH</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={onClose} className="text-foreground hover:bg-accent/10">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4">
          <p className="px-3 text-muted-foreground uppercase text-xs tracking-wider font-semibold mb-4">
            Tools & Features
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                end
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/30 font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/10 font-medium"
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="bg-gradient-to-br from-green-500/10 to-green-400/20 border border-green-500/30 p-4 rounded-xl shadow-[0_0_15px_rgba(0,255,0,0.2)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-400 flex items-center justify-center shadow-[0_0_10px_rgba(0,255,0,0.4)]">
                <span className="text-sm font-bold text-black">JD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-emerald-600 dark:text-white">John Doe</p>
                <p className="text-xs text-green-400 font-medium">Premium</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function MobileNavButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 rounded-lg border border-border/70 text-gray-800 dark:text-white hover:bg-accent/10 bg-background/80"
      >
        <Menu className="w-5 h-5" />
      </Button>

      <MobileNavDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
